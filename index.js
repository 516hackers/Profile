// --- Configuration ---
// !!! IMPORTANT: REPLACE WITH YOUR PROJECT ID !!!
const projectId = '87a3bb99cce9e1250fe4d16e89c5b192';

// XDC Network Details (Chain ID 50)
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
let web3Modal = null; // This will hold the instance of Web3Modal

// --- Utility Functions ---

/**
 * Updates the UI state (button disabling and address display).
 * This function MUST be called after the DOM is loaded.
 */
function setUIConnected(isConnected) {
    // These lookups are now safe because they are inside DOMContentLoaded
    const sendButton = document.getElementById("sendButton");
    const disconnectButton = document.getElementById("disconnectButton");
    const addressElement = document.getElementById("address");

    if (sendButton) sendButton.disabled = !isConnected;
    if (disconnectButton) disconnectButton.disabled = !isConnected;
    
    if (isConnected && account) {
        // Display a shortened version of the address
        addressElement.innerHTML = account.substring(0, 6) + '...' + account.substring(account.length - 4);
    } else {
        addressElement.innerHTML = "Not Connected";
    }
}

/**
 * Initializes the Web3Modal instance.
 * Checks for the global object created by the UMD script in index.html.
 */
const initializeWeb3Modal = () => {
    // Check for the global Web3Modal object (created by the CDN script)
    if (window.Web3Modal && window.Web3Modal.Web3Modal) {
        web3Modal = new window.Web3Modal.Web3Modal({
            projectId,
            chains: [XDC_NETWORK],
            themeMode: 'light',
            enableAuthMode: false 
        });
        console.log("Web3Modal V2 Initialized successfully.");
    } else {
        console.error("Web3Modal V2 is not loaded. Ensure the script tag in index.html is correct and loaded before index.js.");
    }
};

// --- Wallet Functions ---

const connectWC = async () => {
    // Only initialize the modal if it hasn't been done yet (or if the previous attempt failed)
    if (!web3Modal) {
        initializeWeb3Modal();
    }
    
    // Check if initialization succeeded before proceeding
    if (!web3Modal) {
        alert("WalletConnect initialization failed. Please check your console for details.");
        return;
    }

    try {
        console.log("Attempting to connect...");
        
        // Open the modal and get the Ethereum provider (V2 protocol)
        const modalProvider = await web3Modal.openModal();

        // Set the global provider and Web3 instance
        provider = modalProvider;
        web3 = new Web3(provider);

        // Get connected accounts
        // Note: The accounts array comes from the provider itself after connection
        const accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) {
            account = accounts[0];
            setUIConnected(true);

            const balance = await web3.eth.getBalance(account);
            console.log("Connected Address:", account);
            console.log("Balance:", web3.utils.fromWei(balance, "ether"), "XDC");

            // Setup listeners for runtime changes
            setupEventListeners();
        }

    } catch (error) {
        console.error("Connection failed:", error);
        setUIConnected(false);
        if (error.code === 4001) {
             alert("Connection rejected by user.");
        } else {
             alert(`Connection error: ${error.message || 'Check console.'}`);
        }
    }
};

const send = async () => {
    if (!web3 || !account) {
        alert("Please connect your wallet first.");
        return;
    }

    try {
        // Get the recipient address from the input field
        var toAddress = document.getElementById("toAddressInput").value;

        if (!toAddress) {
            alert("Please enter a destination address.");
            return;
        }
        
        const valueToSend = web3.utils.toWei("0.001", "ether");

        console.log(`Sending ${web3.utils.fromWei(valueToSend, "ether")} XDC from ${account} to ${toAddress}`);

        // Send the transaction using the connected provider
        const transaction = await web3.eth.sendTransaction({
            from: account,
            to: toAddress,
            value: valueToSend,
            // gasPrice and gasLimit are often optional and can be calculated by the wallet
        });

        console.log("Transaction successful:", transaction);
        alert(`Transaction successful! Hash: ${transaction.transactionHash}`);

    } catch (error) {
        console.error("Transaction failed:", error);
        alert(`Transaction failed: ${error.message || "User cancelled or transaction failed."}`);
    }
};

const disconnect = async () => {
    try {
        if (provider) {
            // This method is available on the WalletConnect V2 provider
            await provider.disconnect(); 
            console.log("Wallet disconnected");
        }
    } catch (error) {
        console.error("Disconnection failed:", error);
    } finally {
        // Reset state and update UI
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
        // Ensure the chain ID is a number for comparison
        if (Number(chainId) !== XDC_CHAIN_ID) {
            alert(`Switched to unsupported chain ${chainId}. Please switch back to XDC Network (${XDC_CHAIN_ID}).`);
            // You may want to force disconnect here
            // disconnect(); 
        }
    });
};

// --- Initialization Logic (MUST be at the end of the file) ---

/**
 * Ensures the initialization logic runs ONLY after all HTML elements are loaded.
 * This solves the "Cannot set properties of null (setting 'disabled')" error.
 */
document.addEventListener('DOMContentLoaded', (event) => {
    console.log("DOM fully loaded and parsed. Initializing...");
    
    // 1. Initialize Web3Modal (attempts to set the global web3Modal variable)
    initializeWeb3Modal();

    // 2. Set the initial UI state (Now the buttons are guaranteed to exist)
    setUIConnected(false);
});
