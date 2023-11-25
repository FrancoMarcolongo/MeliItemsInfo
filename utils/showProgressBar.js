const readline = require('readline');

function showProgressBar(current, total, error) {
    const percentage = (current / total) * 100;
    const completedLength = Math.floor((percentage / 100) * (process.stdout.columns - 2 - 30));
    const remainingLength = process.stdout.columns - 2 - completedLength - 30;

    const validCompletedLength = Math.min(completedLength, process.stdout.columns - 2 - 30);

    const progressBar = `[${'@'.repeat(validCompletedLength)}${'-'.repeat(remainingLength)}] ${percentage.toFixed(2)}%`;

    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    if (error) console.log(error);
    process.stdout.write(progressBar);
    readline.cursorTo(process.stdout, 0);
}
exports.showProgressBar = showProgressBar;
