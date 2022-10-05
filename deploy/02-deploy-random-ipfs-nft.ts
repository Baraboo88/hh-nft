import {
    developmentChains,
    networkConfig,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../helper-hardhat-config";
import { verify } from "../utils/verify";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { storeImages, storeTokenUriMetadata } from "../utils/uploadToPinata";

import "dotenv/config";

const FUND_AMOUNT = "1000000000000000000000";

const imagesLocation = "./images/random";

const metadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [{ trait_type: "Cuteness", value: 100 }],
};

export let tokenUris = [
    "ipfs://Qmby5bQhNnDsMn1Pey9eh9p4tX78QYAkfS3yoskiT2MJKz",
    "ipfs://QmVUFbCCT6FB4z9rz5tDbPpZxRGuDJmCFF78Exiahtqpqt",
    "ipfs://QmNeEi4TyyRWbKafwDQsVmGok3kbC7x3BwYLGFBo9xJKCf",
];

const deployRandomIpfsNft: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    // @ts-ignore
    const { deployments, getNamedAccounts, network, ethers } = hre;
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    //get IPFS hashes for our images

    if (process.env.UPLOAD_TO_PINATA === "true") {
        tokenUris = await handleTokenUris();
    }
    // 1. With our own IPFS manually
    // 2. to do it programmatically - Pinata
    // 3. NFT. storage

    let vrfCoordinatorV2Address, subscriptionId;

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
        const tranctionResponse = await vrfCoordinatorV2Mock.createSubscription();
        const tranctionReceipt = await tranctionResponse.wait(1);
        subscriptionId = tranctionReceipt.events[0].args.subId;
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT);
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId!]["vrfCoordinatorV2"];
        subscriptionId = networkConfig[chainId!]["subscriptionId"];
    }
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS;
    log("-------------------------------------");

    const gasLane = networkConfig[chainId!]["gasLane"];
    const callBackGasLimit = networkConfig[chainId!]["callbackGasLimit"];
    const mintFee = networkConfig[chainId!]["mintFee"];

    const args = [
        vrfCoordinatorV2Address,
        subscriptionId,
        gasLane,
        callBackGasLimit,
        tokenUris,
        mintFee,
    ];
    const randomipfsNft = await deploy("RandomIpfsNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: waitBlockConfirmations || 1,
    });

    log("-------------------------------------");

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(randomipfsNft.address, args);
    }
};

async function handleTokenUris() {
    let tokenUries: string[] = [];
    //store the Image in IPFS
    // Store the metadata in IPFS
    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation);

    for (let imageUploadResponseIndex in imageUploadResponses) {
        //create metadata
        // upload metadata

        let tokenUriMetaData = { ...metadataTemplate };
        tokenUriMetaData.name = files[imageUploadResponseIndex].replace(".png", "");
        tokenUriMetaData.description = `An Adorable ${tokenUriMetaData.name} pup!`;
        tokenUriMetaData.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`;
        console.log(`Uploading ${tokenUriMetaData.name}...`);
        //store the JSON to pinata / IPFS
        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetaData);
        tokenUries.push(`ipfs://${metadataUploadResponse?.IpfsHash}`);
    }
    console.log("Token URIs Uploaded! They Are:");
    console.log(tokenUries);
    return tokenUries;
}

export default deployRandomIpfsNft;
deployRandomIpfsNft.tags = ["all", "randomipfs", "main"];
