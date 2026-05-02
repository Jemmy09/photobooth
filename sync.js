const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("\x1b[36m%s\x1b[0m", "==============================================");
console.log("\x1b[36m%s\x1b[0m", "       PhotoBooth Monorepo Sync Tool");
console.log("\x1b[36m%s\x1b[0m", "==============================================");

rl.question('Enter commit message (default: "Update PhotoBooth project"): ', (message) => {
    const commitMessage = message || "Update PhotoBooth project";

    try {
        console.log("\n[1/3] \x1b[33mStaging changes...\x1b[0m");
        execSync('git add .', { stdio: 'inherit' });

        console.log("[2/3] \x1b[33mCommitting changes...\x1b[0m");
        execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });

        console.log("[3/3] \x1b[33mPushing to GitHub...\x1b[0m");
        execSync('git push origin main', { stdio: 'inherit' });

        console.log("\n\x1b[32m%s\x1b[0m", "✅ Project successfully synced to GitHub!");
    } catch (error) {
        console.log("\n\x1b[31m%s\x1b[0m", "❌ Error during sync. Make sure you have git installed and are in a git repository.");
        // console.error(error);
    }

    rl.close();
});
