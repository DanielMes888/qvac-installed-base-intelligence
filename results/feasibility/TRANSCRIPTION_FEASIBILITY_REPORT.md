# Local transcription feasibility

Outcome: **passed** on 2026-09-11.

The single evaluated route was `@qvac/sdk 0.19.0` with the Whisper Tiny multilingual Q8 model exposed as `WHISPER_TINY_Q8_0`. The pinned model is 43,537,433 bytes, comes from `ggerganov/whisper.cpp` revision `5359861c739e955e79d9a303bcbc70fb988958b1`, and is covered by the upstream MIT license. Its checksum is `c2085835d3f50733e2ff6e4b41ae8a2b8d8110461e18821b09a15c40c42d1cca`.

The fixture is a 5.17-second mono WAV generated locally with Microsoft Sabina speaking a synthetic Spanish equipment observation. Download plus first load took 33.45 seconds. With the model cached, loading took 3.36 seconds; the first transcription took 330 ms and the second 323 ms without reloading. Process RSS increased by about 10.5 MB while system free memory varied by about 287 MB; these are approximate samples, not isolated model allocation.

The transcript retained 4 of 6 required terms (66.7%). It preserved the MRI/radiology meaning but misheard the fictitious name `NovaMed`; it is sufficiently understandable and editable for the bounded demonstration, not accurate enough to bypass review.

No Node network-boundary attempt was observed after loading the cached assets. This is instrumented evidence, not a complete operating-system audit. The experiment removed its temporary audio, unloaded the model, closed QVAC, and left the Workspace unchanged. The cached model remains outside Git.
