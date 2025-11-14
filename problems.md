Your /api/generate route attempted to call the Gemini image API and the provider returned an error (500) saying the image generation failed and to check the API key. Common root causes:

Invalid/missing API key or wrong key type (using an OAuth token where an API key is expected, or vice versa).

Model or endpoint mismatch (using an image model that your project does not have access to, or calling :generateImage when your account only supports :generateContent).

Project quota / billing issues (image models may require billing/paid quota).

Provider-side transient error (less likely given message references API key).