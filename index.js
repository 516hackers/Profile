// --- Configuration ---
// !!! IMPORTANT: REPLACE WITH YOUR PROJECT ID !!!
const projectId = '87a3bb99cce9e1250fe4d16e89c5b192';

// XDC Network Details
const XDC_CHAIN_ID = 50; 
const XDC_NETWORK = {
    chainId: XDC_CHAIN_ID,
    name: 'XDC Network',
    currency: 'XDC',
    rpcUrl: 'https://erpc.xdcrpc.com',
    explorerUrl: 'https://xdcscan.io'
};

// --- State Variables ---
let provider = null;
let web3 = null;
let account = null;
let web3Modal = null;

// --- Utility Functions ---

function setUIConnected(isConnected) {
    document.getElementById("sendButton").disabled = !isConnected;
    document.getElementById("disconnectButton").disabled = !isConnected;
    
    const addressElement = document.getElementById("address");
    if (isConnected && account) {
        addressElement.innerHTML = account.substring(0, 6) + '...' + account.substring(account.length - 4);
    } else {
        addressElement.innerHTML = "Not Connected";
    }
}

// --- Wallet Functions ---

const initializeWeb3Modal = () => {
    // Only initialize if the global Web3Modal object is available
    if (window.Web3Modal) {
        web3Modal = new window.Web3Modal.Web3Modal({
            projectId,
            chains: [XDC_NETWORK],
            themeMode: 'light', // or 'dark'
            enableAuthMode: false // Recommended for dApps
        });
    } else {
        console.error("Web3Modal is not loaded. Check the index.html script import.");
    }
};

const connectWC = async () => {
    if (!web3Modal) {
        initializeWeb3Modal();
    }

    try {
        console.log("Attempting to connect...");
        
        // Open the modal and get the provider
        const modalProvider = await web3Modal.openModal();

        // Set the global provider and Web3 instance
        provider = modalProvider;
        web3 = new Web3(provider);

        // Get connected accounts
        const accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) {
            account = accounts[0];
            setUIConnected(true);

            const balance = await web3.eth.getBalance(account);
            console.log("See your address:", account);
            console.log("Your balance:", web3.utils.fromWei(balance, "ether"), "XDC");

            // Setup listeners for disconnect and account/chain changes
            setupEventListeners();
        }

    } catch (error) {
        console.error("Connection failed:", error);
        setUIConnected(false);
    }
};

const send = async () => {
    if (!web3 || !account) {
        console.log("Web3 not initialized or not connected.");
        return;
    }

    try {
        var toAddress = document.getElementById("toAddressInput").value;

        if (!toAddress) {
            alert("Please enter a destination address.");
            return;
        }
        
        const valueToSend = web3.utils.toWei("0.001", "ether");

        console.log(`Sending ${web3.utils.fromWei(valueToSend, "ether")} XDC from ${account} to ${toAddress}`);

        // The sendTransaction call is handled the same way by Web3.js
        const transaction = await web3.eth.sendTransaction({
            from: account,
            to: toAddress,
            value: valueToSend
        });

        console.log("Transaction successful:", transaction);
        alert(`Transaction successful! Hash: ${transaction.transactionHash}`);

    } catch (error) {
        console.error("Transaction failed:", error);
        alert(`Transaction failed: ${error.message || error}`);
    }
};

const disconnect = async () => {
    try {
        if (provider) {
            await provider.disconnect();
            console.log("Wallet disconnected");
        }
    } catch (error) {
        console.error("Disconnection failed:", error);
    } finally {
        // Reset state
        account = null;
        provider = null;
        web3 = null;
        setUIConnected(false);
    }
};

const setupEventListeners = () => {
    if (!provider) return;

    // Disconnect event
    provider.on('disconnect', () => {
        console.log("Provider disconnected (event triggered)");
        disconnect(); // Call local disconnect to reset state
    });

    // Account change event
    provider.on('accountsChanged', (newAccounts) => {
        if (newAccounts.length > 0) {
            account = newAccounts[0];
            setUIConnected(true);
            console.log("Account changed to:", account);
        } else {
            disconnect();
        }
    });

    // Chain change event
    provider.on('chainChanged', (chainId) => {
        console.log("Chain ID changed to:", chainId);
        if (Number(chainId) !== XDC_CHAIN_ID) {
            alert(`Switched to unsupported chain ${chainId}. Please switch back to XDC Network (${XDC_CHAIN_ID}).`);
        }
    });
};

document.addEventListener('DOMContentLoaded', (event) => {
    initializeWeb3Modal();
    setUIConnected(false);
});
