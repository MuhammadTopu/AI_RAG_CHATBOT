import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { CSVLoader } from "langchain/document_loaders/fs/csv";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'text-embedding-3-small',
  timeout: 60000,
  maxRetries: 5,
});
const config = {
  postgresConnectionOptions: {
    type: "postgres",
    host: "192.168.5.92",
    port: 5433,
    user: "postgres",
    password: "root",
    database: "testB_langchains",
  },
  tableName: "testlangchainjs",
  columns: {
    idColumnName: "id",
    vectorColumnName: "vector",
    contentColumnName: "content",
    metadataColumnName: "metadata",
  },
  distanceStrategy: "cosine",
};
// Initialize vector store
let vectorStore;
try {
  vectorStore = await PGVectorStore.initialize(embeddings, config);
} catch (error) {
  console.error("Error initializing vector store:", error);
  process.exit(1);
}

export { vectorStore };
export async function indexTheDocs(filePath) {
  try {
    const fileExtension = path.extname(filePath).toLowerCase();
    let docs;
    if (fileExtension === '.pdf') {
      const loader = new PDFLoader(filePath);
      docs = await loader.load();
    } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      const loader = new CSVLoader(filePath);
      docs = await loader.load();
    } else if (fileExtension === '.csv') {
      const loader = new CSVLoader(filePath);
      docs = await loader.load();
    } else {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }

   // console.log(`Loaded ${docs.length} documents from ${fileExtension} file`);

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 100,
    });

    const texts = await textSplitter.splitDocuments(docs);
    console.log(`Split file into ${texts.length} chunks`);

    // Add file type to metadata
    const documentsWithMetadata = texts.map(doc => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        source: filePath,
        fileType: fileExtension,
        fileName: path.basename(filePath)
      }
    }));

    await vectorStore.addDocuments(documentsWithMetadata);
    
    // Clean up uploaded file after processing
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    console.log("Documents indexed successfully.");
    return { success: true, chunks: texts.length, fileType: fileExtension };
  } catch (error) {
    console.error("Error indexing documents:", error);
    // Clean up file even if processing fails
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
}