import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { BigNumber } from "ethers";
import { deployments, ethers, network } from "hardhat";
import { tokenUris } from "../../deploy/02-deploy-random-ipfs-nft";
import { developmentChains, networkConfig } from "../../helper-hardhat-config";
import { RandomIpfsNft, VRFCoordinatorV2Mock } from "../../typechain-types";

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("RandomIpfsNft", () => {
          let randomIpfsNft: RandomIpfsNft;
          let deployer: SignerWithAddress;
          let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
          let mintFee: BigNumber;
          let interval: BigNumber;
          const chainId = network.config.chainId;

          beforeEach(async () => {
              const accounts = await ethers.getSigners();
              deployer = accounts[0];
              await deployments.fixture(["mocks", "randomipfs"]);
              randomIpfsNft = await ethers.getContract("RandomIpfsNft");

              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
              mintFee = await randomIpfsNft.getMintFee();
          });

          describe("consturctor", () => {
              it("should be able to create a RandomIpfsNft", async () => {
                  //Ideally we make our test have just 1 assert per it

                  const uriOne = await randomIpfsNft.getTokenUris(0);
                  const uriTwo = await randomIpfsNft.getTokenUris(1);
                  const uriTree = await randomIpfsNft.getTokenUris(2);

                  const tokenCounter = await randomIpfsNft.getTokenCounter();
                  assert.equal(tokenCounter.toString(), "0");
                  assert.equal(uriOne, tokenUris[0]);
                  assert.equal(uriTwo, tokenUris[1]);
                  assert.equal(uriTree, tokenUris[2]);
              });
          });

          describe("requestNft", () => {
              it("revert when you dont pay enought", async () => {
                  await expect(randomIpfsNft.requestNft()).to.be.revertedWith(
                      "RandomIpfsNft__NeedMoreEthSent"
                  );
              });
              it("emit event on enter", async () => {
                  await expect(randomIpfsNft.requestNft({ value: mintFee })).to.be.emit(
                      randomIpfsNft,
                      "NftRequest"
                  );
              });
          });

          describe("fulfillRandomWords", () => {
              it("mints NFT after random number returned", async () => {
                  await new Promise<void>(async (resolve, reject) => {
                      randomIpfsNft.once("NftMinted", async () => {
                          console.log("NftMinted event fired");

                          try {
                              const tokenUri = await randomIpfsNft.tokenURI(0);
                              const tokenCounter = await randomIpfsNft.getTokenCounter();
                              assert.equal(tokenUri.toString().includes("ipfs://"), true);
                              assert.equal(tokenCounter.toString(), "1");
                              resolve();
                          } catch (err) {
                              console.log(err);
                              reject();
                          }
                      });
                      try {
                          const txResponse = await randomIpfsNft.requestNft({ value: mintFee });
                          const txReciept = await txResponse.wait(1);
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              txReciept.events![1].args!.requestId,
                              randomIpfsNft.address
                          );
                      } catch (err) {
                          console.log(err);
                          reject();
                      }
                  });
              });
          });
      });
