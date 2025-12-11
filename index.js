// --- Configuration ---
// !!! IMPORTANT: REPLACE WITH YOUR PROJECT ID !!!
const projectId = '87a3bb99cce9e1250fe4d16e89c5b192';

// XDC Network Details
const XDC_CHAIN_ID = 50; 
const XDC_RPC_URL = 'https://erpc.xdcrpc.com';
const XDC_NETWORK_ID = 'eip155:50'; // Namespace:ChainID for V2

// --- State Variables ---
let provider = null; // The WalletConnect V2 provider
let web3 = null;     // The Web3.js instance
let account = null;  // The connected account address

// --- Utility Functions ---

/**
 * Updates the UI state (button disabling and address display).
 * This function is now safer as it only runs after DOMContentLoaded.
 */
function setUIConnected(isConnected) {
    // Lookups are safe due to DOMContentLoaded listener
    const connectButton = document.getElementById("connectButton");
    const sendButton = document.getElementById("sendButton");
    const disconnectButton = document.getElementById("disconnectButton");
    const addressElement = document.getElementById("address");

    // Toggle button state
    if (connectButton) connectButton.disabled = isConnected;
    if (sendButton) sendButton.disabled = !isConnected;
    if (disconnectButton) disconnectButton.disabled = !isConnected;
    
    // Update address display
    if (isConnected && account) {
        addressElement.innerHTML = account.substring(0, 6) + '...' + account.substring(account.length - 4);
    } else {
        addressElement.innerHTML = "Not Connected";
    }
}

// --- Wallet Functions ---

/**
 * Initializes the V2 EthereumProvider and sets up the event listeners.
 */
const initializeProvider = async () => {
    try {
        // EthereumProvider is exposed globally by the module import in index.html
        if (window.EthereumProvider) {
            provider = await window.EthereumProvider.init({
                projectId: projectId, 
                chains: [XDC_CHAIN_ID], // Required chain ID
                rpcMap: {
                    [XDC_CHAIN_ID]: XDC_RPC_URL,
                },
                showQrModal: true, // Use the built-in modal
                optionalChains: [], 
                methods: ["eth_sendTransaction", "personal_sign", "eth_signTypedData"],
                events: ["chainChanged", "accountsChanged", "disconnect"]
            });

            console.log("WalletConnect V2 Provider Initialized.");
            setupEventListeners();
        } else {
            console.error("Window.EthereumProvider is not defined. Check the script type='module' in index.html.");
        }
    } catch (error) {
        console.error("Provider initialization failed:", error);
        alert("Provider initialization failed. Please check your console.");
    }
}

const connectWC = async () => {
    // Initialize the provider if it's not ready
    if (!provider) {
        await initializeProvider();
    }

    if (!provider) return; // Stop if initialization failed

    try {
        console.log("Attempting to connect...");
        
        // Connect opens the QR modal and awaits session establishment
        const session = await provider.connect();

        // Get connected accounts from the session object
        // The V2 connect method returns an array of accounts
        const accounts = session.namespaces.eip155.accounts.map(acc => acc.split(':').pop());
        
        if (accounts.length > 0) {
            account = accounts[0];
            web3 = new Web3(provider); // Initialize Web3.js with the new provider
            setUIConnected(true);

            const balance = await web3.eth.getBalance(account);
            console.log("Connected Address:", account);
            console.log("Balance:", web3.utils.fromWei(balance, "ether"), "XDC");
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
        var toAddress = document.getElementById("toAddressInput").value;
        if (!toAddress) {
            alert("Please enter a destination address.");
            return;
        }
        
        const valueToSend = web3.utils.toWei("0.001", "ether");

        console.log(`Sending ${web3.utils.fromWei(valueToSend, "ether")} XDC from ${account} to ${toAddress}`);

        // The sendTransaction call is handled by the V2 provider
        const transaction = await web3.eth.sendTransaction({
            from: account,
            to: toAddress,
            value: valueToSend,
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
            await provider.disconnect(); 
            console.log("Wallet disconnected");
        }
    } catch (error) {
        console.error("Disconnection failed:", error);
    } finally {
        // Reset state and update UI
        account = null;
        web3 = null;
        setUIConnected(false);
    }
};

const setupEventListeners = () => {
    if (!provider) return;

    // The provider emits standard EIP-1193 events
    provider.on('disconnect', () => {
        console.log("Provider disconnected (event triggered)");
        disconnect(); // Call local disconnect to reset state
    });

    provider.on('accountsChanged', (newAccounts) => {
        if (newAccounts.length > 0) {
            // Accounts are returned in the format namespace:chainid:address, so we extract the address
            account = newAccounts[0].split(':').pop();
            setUIConnected(true);
            console.log("Account changed to:", account);
        } else {
            disconnect();
        }
    });

    provider.on('chainChanged', (chainId) => {
        console.log("Chain ID changed to:", chainId);
        if (Number(chainId) !== XDC_CHAIN_ID) {
            alert(`Switched to unsupported chain ${chainId}. Please switch back to XDC Network (${XDC_CHAIN_ID}).`);
        }
    });
};

// --- Initialization Logic ---

/**
 * Ensures the initialization logic runs ONLY after all HTML elements are loaded.
 * This solves the "Cannot set properties of null" error.
 */
document.addEventListener('DOMContentLoaded', (event) => {
    console.log("DOM fully loaded and parsed. Setting initial state.");
    
    // Set the initial UI state (Now the buttons are guaranteed to exist)
    setUIConnected(false);
    
    // The provider is initialized when the user clicks connect
});
