---
description: "Generate a complete, runnable TypeScript snippet to write an NDEF record to an NFC tag using react-native-nfc-manager. Supports URL, Text, WiFi, and vCard record types."
argument-hint: "record type (url | text | wifi | vcard) and the payload data (e.g. 'url https://example.com')"
agent: "NFC Agent"
tools: [read, edit, search]
---

Generate a complete TypeScript React Native component (functional component with hooks) that writes an NDEF record to an NFC tag using `react-native-nfc-manager`.

## Inputs

- **Record type**: ${input:recordType:url|text|wifi|vcard}
- **Payload**: ${input:payload:e.g. https://example.com, Hello World, SSID::Password, or vCard fields}

## Requirements

1. **Correctness**: Use the exact `Ndef` helper or byte-encoding approach for the chosen record type:
   - `url` → `Ndef.uriRecord(url)`
   - `text` → `Ndef.textRecord(text, 'en')`
   - `wifi` → MIME type `application/vnd.wfa.wsc` with a correctly structured WSC TLV byte payload
   - `vcard` → MIME type `text/vcard` with a valid vCard 3.0 string

2. **Session lifecycle**: Follow the **Request → Scan → Write → Release** pattern exactly:
   - Call `NfcManager.requestTechnology(NfcTech.Ndef)` before writing
   - Write inside a `try` block
   - Call `NfcManager.cancelTechnologyRequest()` in the **`finally`** block — never omit this

3. **Support check**: Call `NfcManager.isSupported()` before starting any session; handle `false` gracefully with user feedback.

4. **Cleanup**: Return a cleanup function from `useEffect` that calls `NfcManager.cancelTechnologyRequest()` to handle unmount during an active scan.

5. **Platform notes**: Add an inline comment where behavior differs between Android (Background Dispatch) and iOS (system NFC sheet).

6. **Payload size**: Calculate and log the encoded byte length; warn if it may exceed common tag limits (NTAG213 = 144 bytes, NTAG215 = 504 bytes).

## Output Format

Provide:
1. A single self-contained `.tsx` file (component + all imports)
2. Any required `app.json` / `app.config.js` Config Plugin additions for Expo
3. A brief note on any platform-specific setup (entitlement, manifest entry) if not already covered by the Config Plugin

Reference the existing NFC lib at [lib/nfc.ts](../lib/nfc.ts) and follow the patterns already established there.
