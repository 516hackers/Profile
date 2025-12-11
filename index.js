// --- Configuration ---
// !!! IMPORTANT: REPLACE WITH YOUR PROJECT ID !!!
const projectId = '87a3bb99cce9e1250fe4d16e89c5b192';

// XDC Network Details
const XDC_CHAIN_ID = 50; 
const XDC_RPC_URL = 'https://erpc.xdcrpc.com';

// --- State Variables ---
let provider = null; // The WalletConnect V2 provider
let web3 = null;     // The Web3.js instance
let account = null;  // The connected account address

// --- Utility Functions ---

function setUIConnected(isConnected) {
    const connectButton = document.getElementById("connectButton");
    const sendButton = document.getElementById("sendButton");
    const disconnectButton = document.getElementById("disconnectButton");
    const addressElement = document.getElementById("address");

    if (connectButton) connectButton.disabled = isConnected;
    if (sendButton) sendButton.disabled = !isConnected;
    if (disconnectButton) disconnectButton.disabled = !isConnected;
    
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
        // 🟢 FIX: The UMD bundle exposes the provider class as WalletConnectEthereumProvider
        if (window.WalletConnectEthereumProvider) { 
            provider = await window.WalletConnectEthereumProvider.init({
                projectId: projectId, 
                chains: [XDC_CHAIN_ID],
                rpcMap: {
                    [XDC_CHAIN_ID]: XDC_RPC_URL,
                },
                showQrModal: true, 
                optionalChains: [], 
                methods: ["eth_sendTransaction", "personal_sign", "eth_signTypedData"],
                events: ["chainChanged", "accountsChanged", "disconnect"]
            });

            console.log("WalletConnect V2 Provider Initialized.");
            setupEventListeners();
            return true;
        } else {
            console.error("WalletConnectEthereumProvider is not defined. Check the script tag for the V2 UMD bundle in index.html.");
            return false;
        }
    } catch (error) {
        console.error("Provider initialization failed:", error);
        alert("Provider initialization failed. Please check your console.");
        return false;
    }
}

const connectWC = async () => {
    // Initialize the provider if it's not ready
    if (!provider) {
        const initialized = await initializeProvider();
        if (!initialized) return; // Stop if initialization failed
    }

    try {
        console.log("Attempting to connect...");
        
        const session = await provider.connect();

        // Extract accounts from the session object
        const accounts = session.namespaces.eip155.accounts.map(acc => acc.split(':').pop());
        
        if (accounts.length > 0) {
            account = accounts[0];
            web3 = new Web3(provider);
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
        account = null;
        web3 = null;
        setUIConnected(false);
    }
};

const setupEventListeners = () => {
    if (!provider) return;

    provider.on('disconnect', () => {
        console.log("Provider disconnected (event triggered)");
        disconnect();
    });

    provider.on('accountsChanged', (newAccounts) => {
        if (newAccounts.length > 0) {
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

document.addEventListener('DOMContentLoaded', (event) => {
    console.log("DOM fully loaded and parsed. Setting initial state.");
    setUIConnected(false);
    // Provider initialization will happen on the first click of Connect Wallet
});
