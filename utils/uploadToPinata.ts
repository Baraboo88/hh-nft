import ponataSDK, { PinataPinResponse } from "@pinata/sdk";
import path from "path";
import fs from "fs";
import "dotenv/config";

const pinataApiKey = process.env.PINATA_API_KEY || "";
const pinataApiSecret = process.env.PINATA_API_SECRET || "";
const pinata = ponataSDK(pinataApiKey, pinataApiSecret);

export async function storeImages(imagesFilePath) {
    const fullImagesPath = path.resolve(imagesFilePath);
    const files = fs.readdirSync(fullImagesPath);

    let responses: PinataPinResponse[] = [];
    console.log("Uploading to IPFS");
    for (let fileIndex in files) {
        const readableStremForFile = fs.createReadStream(`${fullImagesPath}/${files[fileIndex]}`);
        try {
            const response = await pinata.pinFileToIPFS(readableStremForFile);
            responses.push(response);
        } catch (err) {
            console.log(err);
        }
    }

    return { responses, files };
}

export async function storeTokenUriMetadata(metadata: any) {
    try {
        const response = await pinata.pinJSONToIPFS(metadata);
        return response;
    } catch (err) {
        console.log(err);
    }
}
