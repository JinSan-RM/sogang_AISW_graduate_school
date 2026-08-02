# 비밀정보 검사 기록

확인일: 2026-07-27

## 결과

- Gitleaks `8.30.1`
- Git 전체 이력: 43 commits, 약 1.78 MB 검사, finding 0
- 현재 작업 트리: Git에 추적되거나 추적 대상인 비무시 파일 298개를 격리 복사해 약 3.80 MB 검사, finding 0
- 추적 대상 credential 파일명 검사: finding 0
- local unsigned Android AAB: 74,847,032-byte archive를 1,461 files/219,116,528 bytes로 격리 추출한 뒤 Gitleaks `8.30.1`로 검사, finding 0
- 실제 비밀값을 보고서나 콘솔에 출력하지 않도록 `--redact=100`을 사용했다.

도구는 공식 GitHub release에서 내려받아 공식 checksum 파일과 대조했다.

- Windows x64 archive SHA-256: `d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e`
- 공식 checksum 파일 SHA-256: `061476c21adaf5441516f96f185c1a4706a83cd6329b9b38762271b3d4a52fae`
- CI Linux x64 archive SHA-256: `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb`

CI는 전체 Git 이력을 가져온 뒤 같은 버전의 Linux binary checksum을 검증하고 `gitleaks git`을 실행한다. 별도로 credential 형태의 파일이 추적되면 실패한다.

## 재현 명령

저장소 루트에서 다음과 같이 실행한다. 도구 경로는 로컬 설치 위치로 바꾼다.

```powershell
gitleaks.exe git . --no-banner --redact=100
git ls-files --cached --others --exclude-standard
```

두 번째 목록은 임시 격리 디렉터리에 동일한 상대 경로로 복사한 뒤 다음과 같이 검사한다.

```powershell
gitleaks.exe dir <isolated-worktree> --no-banner --redact=100
```

local unsigned AAB는 원본 archive가 아니라 격리 추출 디렉터리를 같은 방식으로 검사했다. 검사 대상 AAB의 SHA-256은 `5c2acf192fad9d02449cdc9acef059fb98d67655ea684aecc455f0378ee474e0`이다. 이 검사는 비밀정보 탐지 증거이며 package, endpoint, dev-client 문자열, 서명 여부를 대신 검증하지 않는다.

## 남은 출시 경계

- 무시된 로컬 `.env`, signing key, Firebase 파일은 source/artifact에 포함되면 안 된다. 운영 secret store에만 넣는다.
- local unsigned AAB의 추출물 검사는 통과했지만 signed AAB/IPA는 아직 생성되지 않았다. 승인 후 생성한 최종 산출물은 archive scan과 수동 manifest/signature 검사를 다시 수행해야 한다.
- GitHub repository secret scanning 및 push protection 활성화 여부는 repository 관리자 화면에서 확인해야 한다.

공식 근거:

- [Gitleaks releases](https://github.com/gitleaks/gitleaks/releases)
- [GitHub secret scanning](https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning)
- [GitHub push protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection)
