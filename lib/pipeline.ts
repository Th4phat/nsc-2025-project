import {
  pipeline,
  type TextGenerationPipeline,
  type ProgressCallback, // 1. Import the specific ProgressCallback type
} from "@huggingface/transformers";

// Use the Singleton pattern to enable lazy construction of the pipeline.
class AiPipelineSingleton {
  static task = "text-generation" as const;
  static model = "onnx-community/Phi-3.5-mini-instruct-onnx-web";
  static instance: Promise<TextGenerationPipeline> | null = null;

  // 2. Update the method signature to use the correct optional type
  static async getInstance(progress_callback?: ProgressCallback) {
    if (this.instance === null) {
      console.log("AI pipeline instance is null, creating new one.");
      this.instance = pipeline<"text-generation">(this.task, this.model, {
        dtype: "q4f16",
        // This now correctly passes either a ProgressCallback or undefined
        progress_callback,
      });
    }
    return this.instance;
  }
}

export default AiPipelineSingleton;