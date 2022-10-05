import { BasicNft } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deployments, ethers, network } from "hardhat";
import { developmentChains } from "../../helper-hardhat-config";
import { assert } from "chai";

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("BasicNft", () => {
          let basicNft: BasicNft;
          let deployer: SignerWithAddress;

          beforeEach(async () => {
              const accounts = await ethers.getSigners();
              deployer = accounts[0];
              await deployments.fixture(["mocks", "basicnft"]);
              basicNft = await ethers.getContract("BasicNft");
          });

          it("alows users to mint an NFT, and update appropriatele", async () => {
              const txResponse = await basicNft.mintNft();
              await txResponse.wait(1);
              const tokenURI = await basicNft.tokenURI(0);
              const tokenCounter = await basicNft.getTokenCounter();

              assert.equal(tokenCounter.toString(), "1");
              assert.equal(tokenURI, await basicNft.TOKEN_URI());
          });
      });
