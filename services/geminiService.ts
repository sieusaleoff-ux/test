
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ImageSize, AspectRatio } from "../types";

export class GeminiService {
  private static async getAI() {
    // Fixed: Ensure a new instance is created for each call to use the latest API key.
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  static async generateImage(prompt: string, size: ImageSize, aspectRatio: AspectRatio): Promise<string> {
    const ai = await this.getAI();
    // Guideline: Generate images using gemini-2.5-flash-image by default.
    // Upgrade to gemini-3-pro-image-preview only for 2K or 4K.
    const isHighRes = size === '2K' || size === '4K';
    const model = isHighRes ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio,
          // Fixed: imageSize is only supported on gemini-3-pro-image-preview.
          ...(isHighRes ? { imageSize: size } : {})
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from model");
  }

  static async editImage(baseImageBase64: string, colorImageBase64: string, prompt: string): Promise<string> {
    const ai = await this.getAI();
    // We send both images and instructions to blend them or apply the color scheme
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: baseImageBase64.split(',')[1],
              mimeType: 'image/png'
            }
          },
          {
            inlineData: {
              data: colorImageBase64.split(',')[1],
              mimeType: 'image/png'
            }
          },
          { text: `Combine these two images. Use the first image as the subject and the second image's color palette, style, and lighting. Details: ${prompt}` }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No edited image data returned");
  }

  static async animateImage(imageBase64: string, prompt: string, aspectRatio: AspectRatio): Promise<string> {
    const ai = await this.getAI();
    // Fixed: Ensure aspect ratio is strictly 16:9 or 9:16 for Veo.
    const validAspectRatio = (aspectRatio === '9:16') ? '9:16' : '16:9';
    
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt || 'Cinematic animation of this scene',
      image: {
        imageBytes: imageBase64.split(',')[1],
        mimeType: 'image/png'
      },
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: validAspectRatio
      }
    });

    while (!operation.done) {
      // Fixed: Adjusted wait time to 10 seconds per guideline example for smoother polling.
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed");

    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await videoResponse.blob();
    return URL.createObjectURL(blob);
  }
}
