import hre from "hardhat";

async function main() {
  // 1. Cüzdan bilgilerini al
  const [deployer] = await hre.ethers.getSigners();

  if (!deployer) {
    throw new Error("Cüzdan bilgisi alınamadı! .env dosyasını kontrol et.");
  }

  console.log("Deploy eden hesap (Patron):", deployer.address);

  // 2. Kontrat Fabrikasını Çağır
  const ContractFactory = await hre.ethers.getContractFactory("SpellDeck");

  // 3. Deploy İşlemini Başlat
  console.log("Deploy işlemi başlıyor, lütfen bekle...");

  // DÜZELTME BURADA:
  // Senin kontratın constructor'da bir adres istiyor.
  // Biz de senin adresini (deployer.address) gönderiyoruz.
  const contract = await ContractFactory.deploy(deployer.address);

  // 4. Deploy'un tamamlanmasını bekle
  await contract.waitForDeployment();

  // 5. Sonucu Yazdır
  console.log("----------------------------------------------------");
  console.log("BAŞARILI! SpellDeck Kontrat Adresi:");
  console.log(contract.target);
  console.log("----------------------------------------------------");

  // Save address to file for the agent to read reliably
  const fs = require("fs");
  fs.writeFileSync("contract_address.txt", contract.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});