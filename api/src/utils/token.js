import jwt from "jsonwebtoken";
import crypto from "crypto";
import "dotenv/config";

const encryptionKey = Buffer.from(process.env.JWT_ENCRYPTION_KEY, "base64");

const encryptData = (data) => {
    const cipher = crypto.createCipheriv("aes-256-ecb", encryptionKey, null);
    let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
};

const decryptData = (encryptedData) => {
    const decipher = crypto.createDecipheriv("aes-256-ecb", encryptionKey, null);
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted);
};

export const generateToken = async (session) => {
    const encryptedData = encryptData(session);

    return jwt.sign(
        { encryptedData },
        process.env.JWT_KEY,
        { expiresIn: "1d" }
    );
};

export const decodeToken = (token) => {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    return decryptData(decoded.encryptedData);
};
