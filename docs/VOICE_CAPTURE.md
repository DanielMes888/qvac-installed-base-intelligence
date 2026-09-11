# Local voice capture

Ticket 08 uses the owner-approved `@qvac/sdk 0.19.0` `WHISPER_TINY_Q8_0` route on the same Windows computer as the local Workspace. The application checks that the model is already cached before loading it; it does not add a download or remote fallback.

Chrome and Edge normally expose microphone recordings as WebM/Opus. The application selects the first explicitly supported `MediaRecorder` MIME type, retains the tracks until the recorder emits its final `stop` event, then decodes the completed Blob with the browser's local Web Audio implementation. It mixes channels and resamples to **16 kHz, mono, 16-bit PCM WAV** before upload. Only that normalized WAV is exposed for temporary playback or sent as a binary `audio/wav` request to the loopback Node host.

The UI's metadata-only diagnostic area reports microphone permission state, MediaRecorder availability, selected/recorded Blob MIME type, byte size, actual decoded duration, playback-object-URL state, normalized format, upload content type, and server-received WAV metadata. It never logs or displays audio bytes as diagnostic data and does not log transcript content. The host uses a server-generated temporary directory, transcribes through QVAC, and removes the temporary file after success, error, or cancellation. One loaded transcription model is reused and unloaded during server shutdown.

Audio and unsubmitted transcripts are not Workspace data. Transcription alone cannot create an Observation, Evidence Entry, Draft Claim, Equipment Record, opportunity signal, Verification Item, or aggregate change. The user must review or edit the transcript, choose **Usar como observación**, and then explicitly choose **Guardar y analizar con QVAC**. Only that submitted text is persisted, with `voice` provenance, before the unchanged extraction-v9 workflow starts. Workspace export contains the reviewed text and provenance, never the original audio.

## Demonstrated limitations

- Whisper Tiny produced an understandable but imperfect transcript of the synthetic Spanish fixture and misheard the fictitious proper name. Review is mandatory.
- The deterministic smoke exercises the real cached transcription engine and a controlled extraction adapter; it intentionally does not repeat a real extraction smoke or alter prompt v9.
- Browser microphone availability, permission, codec decoding, and acoustic quality vary by device. Permission denial, unsupported capture, empty/corrupt audio, local-model absence, engine failure, cancellation, and retry remain recoverable without creating records.
- Speaker identity, consent, transcription certainty, production privacy, and official Philips capability are not claimed.
- Instrumented network-boundary evidence is not a complete operating-system security audit.

## Owner validation required for Ticket 08

Ticket 08 remains `in-progress` and awaiting owner validation. Automated tests and the synthetic fixture do not establish that a physical microphone works on the owner's browser/device combination.

1. In PowerShell at the repository root, run `npm.cmd start` and wait for `Prototipo listo en http://127.0.0.1:4173`.
2. Open exactly `http://127.0.0.1:4173` in an updated Chrome or Edge window on the same computer.
3. Choose **Capturar**. Confirm that the existing observation card contains the compact modes **Escribir**, **Imagen**, and **Voz**, with only **Escribir** visible initially.
4. Choose **Voz**. Confirm that the same card now shows **Iniciar grabación**, the state/timer, **Cancelar**, and the synthetic-example option; the normal observation textarea and image controls must no longer be visible.
5. Expand **Diagnóstico de audio**. Confirm `MediaRecorder: Disponible`. Record the displayed permission state.
6. Choose **Iniciar grabación**. If Chrome/Edge asks for microphone access, make the permission decision yourself. For the success path, allow access. Speak a 5–10 second fictional Spanish equipment observation, then choose **Detener** once.
7. Confirm the browser microphone indicator turns off after stopping. Confirm the UI says **Audio capturado correctamente**, reports a duration greater than zero and a nonzero size, and shows the actual recorded MIME (normally `audio/webm;codecs=opus` in Chrome/Edge).
8. Confirm **Conversión local** reports `audio/wav`, PCM mono, 16 bits, and 16000 Hz. Confirm **Reproducción** says `Objeto temporal listo`, choose **Escuchar**, and verify that the recording is audible. **Transcribir** must now be enabled.
9. Choose **Transcribir**. Confirm **Subida local** reports `audio/wav` and a nonzero size. Confirm **Servidor local** reports `audio/wav`, PCM mono, 16 bits, 16000 Hz, the received size, and duration. If it fails, copy only the displayed error category and metadata—never audio bytes or transcript text.
10. Review and deliberately edit the transcript, then choose **Usar como observación**. Confirm the UI returns to **Escribir** with the reviewed text in the normal observation textarea. Confirm no Observation has been submitted and QVAC extraction has not started yet.
11. Choose **Guardar y analizar con QVAC** explicitly. Confirm the saved original text is the reviewed version and its visible provenance is **dictado por voz revisado**.
12. Repeat short recordings to verify cleanup: choose **Volver a grabar**, **Cancelar**, switch from **Voz** to **Escribir** while recording, and close/reload the page while recording. In every case, confirm the browser microphone indicator turns off. Returning to voice must show no prior playback or transcript.
13. For the denial path, use Chrome/Edge's site control for `127.0.0.1` to deny microphone access, choose **Iniciar grabación**, and confirm the Spanish permission-denied message gives a recovery action. Restore the site permission afterward. This settings change is an owner-only step.

Only after both physical-microphone transcription and the in-card mode structure pass should the owner authorize changing Ticket 08 back to `done` and unblocking Ticket 09.

Run focused evidence with:

```powershell
npm.cmd run smoke:voice
node --test test/stretch-goals/voice-browser-audio.test.mjs test/stretch-goals/voice-capture.test.mjs
```
