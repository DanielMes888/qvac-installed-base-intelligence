# Local voice capture

Ticket 08 uses the owner-approved `@qvac/sdk 0.19.0` `WHISPER_TINY_Q8_0` route on the same Windows computer as the local Workspace. The application checks that the model is already cached before loading it; it does not add a download or remote fallback.

The browser records at most 60 seconds, converts the captured audio locally to mono 16-bit PCM WAV, and sends it only to the loopback Node host. The host uses a server-generated temporary directory, transcribes through QVAC, and removes the temporary file on success, error, or cancellation. One loaded transcription model is reused and unloaded during server shutdown.

Audio and unsubmitted transcripts are not Workspace data. Transcription alone cannot create an Observation, Evidence Entry, Draft Claim, Equipment Record, opportunity signal, Verification Item, or aggregate change. The user must review or edit the transcript, choose **Usar como observación**, and then explicitly choose **Guardar y analizar con QVAC**. Only that submitted text is persisted, with `voice` provenance, before the unchanged extraction-v9 workflow starts. Workspace export contains the reviewed text and provenance, never the original audio.

## Demonstrated limitations

- Whisper Tiny produced an understandable but imperfect transcript of the synthetic Spanish fixture and misheard the fictitious proper name. Review is mandatory.
- The deterministic smoke exercises the real cached transcription engine and a controlled extraction adapter; it intentionally does not repeat a real extraction smoke or alter prompt v9.
- Browser microphone availability, permission, codec decoding, and acoustic quality vary by device. Permission denial, unsupported capture, empty/corrupt audio, local-model absence, engine failure, cancellation, and retry remain recoverable without creating records.
- Speaker identity, consent, transcription certainty, production privacy, and official Philips capability are not claimed.
- Instrumented network-boundary evidence is not a complete operating-system security audit.

Run focused evidence with:

```powershell
npm.cmd run smoke:voice
node --test test/stretch-goals/voice-capture.test.mjs
```
