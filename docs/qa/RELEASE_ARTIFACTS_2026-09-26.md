# Three-format release artifacts — 2026-09-26

The initial AAB, APK, and IPA use source commit `122b7b28ad92beecd158dbff885a9aab18e61aa1` (`main`). The corrected 1.0.2 IPA uses commit `cc4151dfdcaa6d926ad4c343cfb06c51328741c4`. All builds use the production environment. The APK profile inherits the production signing credentials and does not increment Android's remote version code after the AAB build.

| Format | Version | EAS build | Artifact | SHA-256 |
| --- | --- | --- | --- | --- |
| AAB | 1.0.1 (Android code 9) | [5ecaa33b](https://expo.dev/accounts/kimjinsan11/projects/sogang-community/builds/5ecaa33b-44ae-425a-989b-d09a5d766ac1) | [Download](https://expo.dev/artifacts/eas/9L3RTBqsV92alNW_IwtOhAWoKE4iKGm3tOR-KFR2WpQ.aab) | `20f449c16140beb4621b2fdbf3f4156c2c7aeb0e9b9a83159428c6e5ebecb059` |
| APK | 1.0.1 (Android code 9) | [677b7d98](https://expo.dev/accounts/kimjinsan11/projects/sogang-community/builds/677b7d98-a663-4113-9cdf-f460bf048f3e) | [Download](https://expo.dev/artifacts/eas/o3y_jC45xxxPLce-Gvg6uJ4JLdzQBd2HlP3RW2FYaws.apk) | `42a5301776da3e55c06b07f4afb185a528f9ea839ee5e3772ce39b21b2041b17` |
| IPA (Apple processing failed) | 1.0.1 (iOS build 10) | [26c5e4ad](https://expo.dev/accounts/kimjinsan11/projects/sogang-community/builds/26c5e4ad-5ded-4a5e-a409-068fa1f4bfcc) | [Download](https://expo.dev/artifacts/eas/-mvjvagoSUi8Y1Fb1bIp5aIjinsbt9ADBcBHPPt2Qxc.ipa) | `d4f16d9332dbb8c1dc9819a3ce6ffa4880235465dacde4d7f2306b8a3e042c13` |
| IPA | 1.0.2 (iOS build 11) | [301bf350](https://expo.dev/accounts/kimjinsan11/projects/sogang-community/builds/301bf350-aff9-4a00-bd03-3bfec2f96cbd) | [Download](https://expo.dev/artifacts/eas/mphjltFLggvOwbfLtICXf7Hi7xeGdjAXdV6FlKLnIZA.ipa) | `975552e787661cf15ca7fd58c16503b8a46b730f41f7b8af79e526262592d89d` |

Local copies are ignored by Git under `outputs/releases/2026-09-26/`.

## Verification

- `npm test`: 804 passed, 0 failed. `npm run typecheck`: passed. `npm run release:check:ci`: passed with 11 previously approved external-input blockers reported by the validator.
- EAS reported the initial three builds `FINISHED` with the same source commit. The AAB and APK share Android code 9 and source fingerprint `5c239f2ba68d66de4b86df79032196a097d09e47`.
- All three downloaded archives passed ZIP integrity checks. The IPA's `Info.plist` contains bundle ID `kr.ac.sogang.aisw.campus`, version `1.0.1`, build `10`, and the `AppIcon` entry. APK manifest inspection shows package `kr.ac.sogang.aisw.campus`, version code `9`, version name `1.0.1`, and target SDK `36`.
- `apksigner verify` passed with APK Signature Scheme v2. `jarsigner -verify` passed for the AAB; its Android upload key is self-signed as expected. The AAB and APK signer SHA-256 digest is `34809aacf23ca22f2522a0c591f6fdf2c2dfe0a0537523e09e6bd486becd31de`.
- [iOS submission b359b9cc](https://expo.dev/accounts/kimjinsan11/projects/sogang-community/submissions/b359b9cc-a066-4f95-9179-a2fb16144f88) is `FINISHED` on EAS, but App Store Connect subsequently marked the 1.0.1/build 10 upload `Failed`. EAS completion therefore did not mean Apple processing succeeded. The exact Apple error detail is pending. The live listing was version `1.1`/build `9` at the last query; 1.0.1/build 10 was not in the valid TestFlight build list.
- [iOS submission da671b78](https://expo.dev/accounts/kimjinsan11/projects/sogang-community/submissions/da671b78-1b17-4ee2-8b83-c72903fade69) uploaded 1.0.2/build 11 from commit `cc4151dfdcaa6d926ad4c343cfb06c51328741c4`. Its downloaded IPA passed ZIP integrity; `Info.plist` contains the expected bundle ID, `1.0.2`/`11`, and `AppIcon`. App Store Connect reports `processingState: VALID` and `READY_FOR_BETA_TESTING` for this build. The public listing remained version `1.1`/build `9` at the same query, so store review/release remains open.

The AAB has not been submitted to Google Play in this run. App Store review/publication and screenshot changes have not been performed in this run.
