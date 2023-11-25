const axios = require('axios');
const FileMaster = require('./utils/FileMaster');
const TokenHandler = require('./utils/TokenHandler');
const GsheetsHandler = require('./utils/gSheetsHandler');

async function getTotalItems(token, inactive, userId) {
    let url = `https://api.mercadolibre.com/users/${userId}/items/search`;
    if (!inactive) url += '?status=active';
    const response = await axios.get(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = response.data;
    return data.paging.total;
}

async function getItemIds(token, inactive, userId) {
    console.log('Getting items...');
    const items = [];
    let offset = 0;
    const limit = 100;
    let total = await getTotalItems(token, inactive, userId);
    console.log('Total items:', total);

    const getItemsBatch = async (offset) => {
        try {
            let url = `https://api.mercadolibre.com/users/${userId}/items/search?offset=${offset}&limit=${limit}`;
            if (!inactive) url += `&status=active`;

            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = response.data;
            return data.results;
        } catch (error) {
            if (error.response.data.message !== 'Invalid limit and offset values') {
                console.error('Error al obtener artículos:', error.response.data.message);
            }
            return [];
        }
    };

    if (total <= 1000) {
        const batchPromises = [];
        while (offset < total || total === 0) {
            batchPromises.push(getItemsBatch(offset));
            offset += limit;
        }

        const batches = await Promise.all(batchPromises);
        items.push(...batches.flat());
    } else {
        let scroll_id;
        do {
            try {
                let url = `https://api.mercadolibre.com/users/${userId}/items/search?search_type=scan&limit=${limit}`;
                if (!inactive) url += `&status=active`;
                if (scroll_id) url += `&scroll_id=${scroll_id}`;

                const response = await axios.get(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                const data = response.data;
                items.push(...data.results);
                scroll_id = data.scroll_id;
                if (data.results.length === 0) scroll_id = null;
            } catch (err) {
                console.error('Error al obtener artículos:', err.response.data.error);
                break;
            }
        } while (scroll_id !== null);
    }

    console.log('Items read:', items.length);
    return items;
}

async function getSaleCostsParallel(token, items) {
    console.log('Getting sales costs...');
    const costsItems = [];
    let counter = 0;
    const requests = items.map(async (item) => {
        let error = null;
        for (let retry = 0; retry < 3; retry++) {
            try {
                error = null;
                const url = `https://api.mercadolibre.com/sites/MLA/listing_prices?price=${item.price}&listing_type_id=${item.listing_type_id}&category_id=${item.category_id}`;
                const response = await axios.get(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                const data = response.data;
                costsItems.push({
                    ...item,
                    saleCost: data.sale_fee_amount,
                    saleFee: data.sale_fee_details.meli_percentage_fee + '%',
                    financingFee: data.sale_fee_details.financing_add_on_fee + '%',
                    totalSaleFee: data.sale_fee_details.percentage_fee + '%',
                });
                break;
            } catch (err) {
                if (err.response && err.response.status === 500) {
                    error = `Internal server error, try ${retry + 1} of 3. Retrying...`;
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else if (err.message.includes('ETIMEDOUT')) {
                    error = `Connection timeout, try ${retry + 1} of 3. Retrying...`;
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    error = `Error al obtener costos de venta: ${item.id}, ${err.response ? err.response.status : err.message}`;
                    break;
                }
            }
        }
    });

    try {
        await Promise.all(requests);
    } catch (error) {
        console.error('Error al realizar solicitudes en paralelo:', error);
    }

    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    return costsItems;
}


function checkDataIntegrity(items){
    const itemsWithErrors = [];
    for(const item of items){
        if(!item.id) itemsWithErrors.push(item.id);
        if(!item.shippingMode) itemsWithErrors.push(item.id);
    }
    if(itemsWithErrors.length > 10){
        console.log('Too many errors, aborting...');
        return false;
    }
    return true;
}

async function getItemDetailsParallel(token, items) {
    console.log('Getting item details...');
    const detailedItems = [];
    let counter = 0;
    const requests = items.map(async (item) => {
        let error;
        for (let retry = 0; retry < 3; retry++) {
            try {
                error = null;
                const url = `https://api.mercadolibre.com/items/${item}`;
                const response = await axios.get(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                const data = response.data;
                // get brand, if doesn't exist, add empty string
                const brand = data.attributes.find((attr) => attr.id === 'BRAND');
                detailedItems.push({
                    id: data.id,
                    title: data.title.replace(/,/g, ' '),
                    price: data.price,
                    listing_type_id: data.listing_type_id,
                    catalog_listing: data.catalog_listing,
                    status: data.status,
                    available_quantity: data.available_quantity,
                    SKU: data.seller_custom_field,
                    category_id: data.category_id,
                    shippingMode: data.shipping.mode,
                    brand: brand ? brand.value_name : '',
                });
                break;
            } catch (err) {
                if (err.response && err.response.status === 500) {
                    error = `Internal server error, try ${retry + 1} of 3. Retrying...`;
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else if (err.message.includes('ETIMEDOUT')) {
                    error = `Connection timeout, try ${retry + 1} of 3. Retrying...`;
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    error = `Error al obtener detalles de artículo: ${item.id}, ${err.response ? err.response.data.message : err.message}`;
                    break;
                }
            }
        }
    });

    try {
        await Promise.all(requests);
    } catch (error) {
        console.error('Error al realizar solicitudes en paralelo:', error);
    }

    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    return detailedItems;
}

async function getShippingCostParallel(token, items) {
    console.log('Getting shipping costs...');
    const fullItems = [];
    let counter = 0;
    const requests = items.map(async (item) => {
        let shippingCost = 0;
        let error = null;
        for (let retry = 0; retry < 3; retry++) {
            try {
                error = null;
                if (item.shippingMode !== 'me2') throw new Error('No tiene Mercado Envíos');
                const url = `https://api.mercadolibre.com/items/${item.id}/shipping_options?zip_code=1001`;
                const response = await axios.get(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                const data = response.data;
                for (const option of data.options) {
                    if (option.name === "Estándar a domicilio") shippingCost = option.list_cost;
                }
                break;
            } catch (err) {
                if (err.message === 'No tiene Mercado Envíos') {
                    //error = `Error al obtener costos de envío: ${item.id} - ${err.message}`;
                    break;
                } else if (err.response && err.response.status === 500) {
                    error = `Internal server error, try ${retry + 1} of 3. Retrying...`;
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else if (err.message.includes('ETIMEDOUT')) {
                    error = `Connection timeout, try ${retry + 1} of 3. Retrying...`;
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    error = `Error al obtener costos de envío: ${item.id} - ${err.response ? err.response.data.error : err.message}`;
                    break;
                }
            }
        }

        return {
            ...item,
            shippingCost: shippingCost,
        };
    });

    try {
        const results = await Promise.all(requests);
        fullItems.push(...results);
    } catch (error) {
        console.error('Error al realizar solicitudes en paralelo:', error);
    }

    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    return fullItems;
}

function processDataSheets(items){
    const headers = [
        'Id ML',
        'SKU',
        'Titulo',
        'Precio',
        'Último costo',
        'Costo nuevo',
        'Utilidad actual',
        '% Uti. actual',
        'Utilidad nueva',
        '% Uti. nueva',
        'Tipo Publicacion',
        'Catalogo',
        'Status',
        'Stock',
        'Marca',
        'Costo Total',
        'IIBB 3.5%',
        'Costo de envío',
        'Costo de venta',
        '% costo venta',
        '% clasica',
        '% Premium'
    ]
    const proccessedItems = [];
    proccessedItems.push(headers);
    let row = 1;
    for(const item of items){
        row++;
        const catalog = item.catalog_listing ? 'si' : 'no';
        const listing = item.listing_type_id === 'gold_pro' ? 'premium' : 'clasica';
        const sku = item.SKU ? item.SKU : '';
        const currentCost = item.currentCost ? item.currentCost : '';
        const newCost = item.newCost ? item.newCost : '';
        //fields with excel formulas to interact with user editable columns
        const costoTotal = `=S${row}+Q${row}+IF(D${row}>10000;R${row};)`  
        const costoVenta = `=D${row}*T${row}` 
        const utilidadActual = `=D${row}-E${row}-P${row}` 
        const utilidadNueva = `=D${row}-F${row}-P${row}` 
        const porcUtiActual = `=IFERROR(G${row}/E${row})` 
        const porcUtiNueva = `=IFERROR(I${row}/F${row})` 
        const iibb = `=(D${row}/1.21)*0.035`

        proccessedItems.push([
            item.id,
            sku,
            item.title,
            item.price,
            currentCost,
            newCost,
            utilidadActual,
            porcUtiActual,
            utilidadNueva,
            porcUtiNueva,
            listing,
            catalog,
            item.status,
            item.available_quantity,
            item.brand,
            costoTotal,
            iibb,
            item.shippingCost,
            costoVenta,
            item.totalSaleFee,
            item.saleFee,
            item.financingFee
        ]);
    }
    return proccessedItems;
}

async function saveData(items){
    console.log('Saving to Google Sheets...');
    const existingItems = await GsheetsHandler.readFromGoogleSheets();
    GsheetsHandler.backUpData(existingItems);
    for(const item of existingItems){
        if(item[0] === 'Id ML') continue;

        const matchingItem = items.find((i) => i.id === item[0]);
        if(matchingItem){
            if (item[4] !== '') matchingItem.currentCost = item[4];
            if (item[5] !== '') matchingItem.newCost = item[5];
        }
    }
    const processedItems = processDataSheets(items);
    await GsheetsHandler.saveData(processedItems);
}

async function main(){
    const startTime = performance.now();
    const userId = FileMaster.getAppData().userId;
    let token = await TokenHandler.getAccessToken();
    if(!await TokenHandler.validateAccessToken(token, userId)) {
        console.log('Token expired, refreshing...');
        token = await TokenHandler.refreshAccessToken();
    }
    //get from console arguments if inactive items are needed
    let inactive = false;
    if(process.argv[2] === '-i') inactive = true;
    let items = await getItemIds(token, inactive, userId);
    if(items.length === 0) {
        console.log('No items found');
        return;
    }
    items = await getItemDetailsParallel(token, items);
    if(!checkDataIntegrity(items)) return;
    items = await getSaleCostsParallel(token, items);
    items = await getShippingCostParallel(token, items);
    await saveData(items);

    const endTime = performance.now();
    const time = (endTime - startTime) / 1000;
    console.log('Execution time:', time.toFixed(2), 'seconds');
    console.log('Last update:', new Date().toLocaleString('es-AR', {timeZone: 'America/Argentina/Buenos_Aires'}));
}

async function timedLoop(hours){
    try{
        await main();
    }catch(err){
        console.error(err);
    }

    setTimeout(()=> timedLoop(hours), 1000*60*60*hours);
}

timedLoop(3);
