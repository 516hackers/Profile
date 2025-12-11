const btn = document.querySelector("#connectBtn");
const addressCont = document.querySelector("#addressCont");

const connect = async () => {
  // console.log("Clicked");
  // console.log(typeof window.ethereum);
  if (typeof window.ethereum !== "undefined") {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    }); //REQUEST ACCESS TO USER'S WALLET
    // console.log(accounts);
    btn.textContent = "Connected!";
    const address = accounts[0];
    addressCont.textContent = address;
  } else {
    addressCont.textContent = "Please Install Trust Wallet or her kids.";
  }
};
// EVENT LISTENERS
btn.addEventListener("click", connect);
