import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = "AIzaSyBG3Svi4uScyTkhtR-iwB-P2MMyPSxJptU";

async function listModels() {
    try {
        const genAI = new GoogleGenAI(apiKey);
        const result = await genAI.listModels();
        console.log("Full Result:", JSON.stringify(result, null, 2));
        console.log("Available Models:");
        result.models.forEach((model) => {
            console.log(`- ${model.name} (supports: ${model.supportedGenerationMethods.join(", ")})`);
        });
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
