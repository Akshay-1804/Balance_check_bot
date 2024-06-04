
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const ethers = require('ethers'); 

// Environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;
const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
const bscscanApiKey = process.env.BSCSCAN_API_KEY;

const bot = new TelegramBot(token, { polling: true });

const mainMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: 'Ethereum (Sepolia)', callback_data: 'ETH' }],
            [{ text: 'Binance Smart Chain (Testnet)', callback_data: 'BSC' }],
            [{ text: 'HOME', callback_data: 'HOME' }]
        ]
    }
};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Welcome to the Wallet Balance Checker Bot! Please select a blockchain network:', mainMenu);
});

bot.on('callback_query', (callbackQuery) => {
    const message = callbackQuery.message;
    const network = callbackQuery.data;

    if (network === 'HOME') {
        bot.sendMessage(message.chat.id, 'Returning to main menu.', mainMenu);
        return;
    }

    bot.sendMessage(message.chat.id, `You selected ${network}. Please enter your wallet address:`);

    bot.once('message', (msg) => {
        if (msg.text !== '/start') {
            const walletAddress = msg.text;
            if (isValidAddress(walletAddress)) {
                getWalletBalance(network, walletAddress, msg.chat.id);
            } else {
                bot.sendMessage(msg.chat.id, 'Invalid wallet address. Please enter a valid wallet address.');
                promptForWalletAddress(network, msg.chat.id); // Re-prompt for wallet address
            }
        }
    });
});

function promptForWalletAddress(network, chatId) {
    bot.sendMessage(chatId, `Please enter your wallet address for ${network}:`);
    bot.once('message', (msg) => {
        if (msg.text !== '/start') {
            const walletAddress = msg.text;
            if (isValidAddress(walletAddress)) {
                getWalletBalance(network, walletAddress, msg.chat.id);
            } else {
                bot.sendMessage(msg.chat.id, 'Invalid wallet address. Please enter a valid wallet address.');
                promptForWalletAddress(network, chatId); // Re-prompt for wallet address again
            }
        }
    });
}

function isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

async function getWalletBalance(network, address, chatId) {
    let apiUrl;
    let unit;

    if (network === 'ETH') {
        apiUrl = `https://api-sepolia.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${etherscanApiKey}`;
        unit = 'ETH';
    } else if (network === 'BSC') {
        apiUrl = `https://api-testnet.bscscan.com/api?module=account&action=balance&address=${address}&tag=latest&apikey=${bscscanApiKey}`;
        unit = 'BNB';
    }

    try {
        console.log(`Requesting balance from URL: ${apiUrl}`); 
        const response = await axios.get(apiUrl);
        //console.log(`API response: ${JSON.stringify(response.data)}`);

        if (response.data.status === '1' && response.data.result !== undefined) {
            const balanceWei = response.data.result;
            const balance = ethers.formatEther(balanceWei);
            bot.sendMessage(chatId, `Your balance: ${balance} ${unit}`, mainMenu);
        } else {
            console.error('Error in response data:', response.data); // Log the response data
            bot.sendMessage(chatId, `Error fetching balance: ${response.data.message || 'Unknown error'}`, mainMenu);
        }
    } catch (error) {
        console.error('Error fetching balance:', error.response ? error.response.data : error.message); // Log the error
        bot.sendMessage(chatId, 'API error or network issue. Please try again later.', mainMenu);
    }
}
