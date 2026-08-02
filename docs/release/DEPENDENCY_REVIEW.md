# 의존성 SBOM 및 라이선스 검토

- 감사 기준일: 2026-07-27 (Asia/Seoul)
- 대상:
  - `backend/requirements.txt`로 설치되는 프로덕션 Python 의존성
  - `frontend/package.json`의 `dependencies`와 `package-lock.json`으로 해석되는 npm 프로덕션 의존성
- 제외:
  - `backend/requirements-test.txt`와 npm `devDependencies`
  - Python/Node/Debian/Alpine/nginx 이미지 자체의 OS 패키지
  - 최종 AAB/IPA에서 추가되는 Gradle, CocoaPods, SDK 바이너리 의존성
- 결론: 이 문서의 범위에서 **금지 라이선스 0, 강한 copyleft-only 의존성 0, 미확인 라이선스 0**이다.
- Release gate 판정: 현재 `REL-14` 완료 기준인 “production dependency/SBOM과 금지 license 검토 증거”를 충족하므로 **`PASS`로 변경 가능**하다.

이 판정은 법률 자문이 아니다. 또한 취약점, 최종 signed artifact, 스토어 제출 준비 상태를 통과시킨다는 의미가 아니다.

## 판정 정책

이번 감사에서는 다음 보수적 정책을 적용했다.

| 분류 | 판정 |
| --- | --- |
| AGPL, GPL-only, SSPL, BUSL 및 기타 source-available/non-commercial 조건 | 모바일 또는 배포 런타임에 포함되면 금지 |
| 라이선스 미상, `SEE LICENSE`인데 원문 부재, 상충하는 메타데이터 | 확인 전까지 금지 |
| LGPL, MPL, EPL, CDDL 등 약한/file-level copyleft | 자동 금지는 아니지만 실제 포함 여부와 배포 의무를 수동 검토 |
| `A OR B` 이중 라이선스 | 허용되는 선택지를 명시적으로 선택할 수 있고 원문이 이를 뒷받침할 때 허용 |
| MIT, BSD, Apache-2.0, ISC, PSF, OFL, CC-BY 등 | 허용하되 고지·저작권·귀속 조건을 배포 시 보존 |

## 감사 입력과 도구

### 입력 무결성

| 입력 | SHA-256 |
| --- | --- |
| `backend/requirements.txt` | `2AC55DF3E5CF5B1CDB8F9218D6CA655D91751B3CF709DD917E8B3EC15190A8BF` |
| `frontend/package.json` | `3F90F7115F2ED234FF2A5B62F3480EA60DFEBA3D8919BA942A0402BB62ED7AEC` |
| `frontend/package-lock.json` | `884AAEC54AEDC1E0F4983A1B943A91D6087794E138056CF08E518754E87EDE82` |

백엔드 프로덕션 이미지 안의 `/app/requirements.txt`도 동일한
`2ac55df3e5cf5b1cdb8f9218d6ca655d91751b3cf709dd917e8b3ec15190a8bf`였다.

### 도구 버전

| 도구 | 버전 |
| --- | --- |
| PowerShell | `5.1.26100.8875` |
| Docker client/server | `27.4.0` / `27.4.0` |
| 프로덕션 백엔드 이미지 Python | `3.12.13` |
| 로컬 frontend 감사 Node/npm | `22.16.0` / `11.4.2` |
| `@cyclonedx/cyclonedx-npm` | `6.0.0` |
| `cyclonedx-bom` | `7.3.1` |
| `pip-licenses` | `5.5.5` |
| `license-checker-rseidelsohn` | npm package `4.4.2`; CLI 자체 표시는 `4.3.0` |
| `fonttools` | `4.61.1` |

`license-checker-rseidelsohn`의 package version과 내장 `--version` 문자열 차이는
도구 자체의 버전 표기 차이로 기록했다. 실제 실행은 npm에서 버전을
`4.4.2`로 고정했다.

## 생성·검증된 증거

거대한 generated SBOM은 저장소에 추가하지 않았다. 감사 시
`%TEMP%\aisw-rel14-8efbfbe87060463e9a399af37527567f` 아래에 만들었으며,
CycloneDX 출력은 `--output-reproducible`과 schema validation을 사용했다.

| 산출물 | 내용 | 검증 결과 | SHA-256 |
| --- | --- | --- | --- |
| `backend-linux.cdx.json` | 실제 Linux/Python 3.12 프로덕션 이미지 환경, CycloneDX JSON 1.6 | 유효; component 37, dependency node 37 | `A06161E4D97CDBEA130DC66096E71756FA3B3C59B349A118B4680FF3ECFE11E5` |
| `backend-linux-licenses.json` | 프로덕션 이미지 Python 라이선스와 원문 | app dependency record 36 | `49DFD87F1398181FA7F228E2E1D0CA441BFE86A18C6E77B71F09AF7B4D9F4F5E` |
| `frontend.cdx.json` | `npm ci --omit=dev` 설치 트리, CycloneDX JSON 1.6 | 유효; recursive component instance 809, dependency node 810 | `6845297FC2E6FC38FFA2F9C5FB02335DD13BC9E7F2CDAA5C029DC5C4BD0F2A21` |
| `frontend-licenses-repro.json` | npm production 라이선스 목록, 상대 경로만 사용 | unique `name@version` record 739, 절대 경로 0 | `9528B19C6186181A7E00F4145FCC01FB06326D0EFC2976FDE1C0181D629924FD` |

Frontend SBOM의 recursive component 809개는 `required` 797개, 현재 감사
플랫폼의 `optional` 1개, 다른 플랫폼 등의 `excluded` 11개다. 고유 PURL은
749개다. 중복 설치 위치를 `name@version`으로 합치고 현재 플랫폼에 설치되지
않은 optional package를 제외한 라이선스 인벤토리는 739개다.

## 백엔드 결과

실제 `aisw_releaseqa-backend:latest` 이미지
`sha256:f7bb95dddc8f1a1059d5c347fc90c956da9e42fe7bc137a62f133c0ffa40511b`
안에서 감사를 수행했다. 이미지 사용자는 `appuser`이고 Python은 `3.12.13`이다.

CycloneDX component 37개 중 하나는 이미지에 포함된 `pip 25.0.1`이고, 앱
의존성은 36개다. 라이선스 표기의 명백한 alias인 `MIT License`는 `MIT`로
정규화했다.

| 라이선스 | 수 | 패키지 |
| --- | ---: | --- |
| `MIT` | 20 | `Mako 1.3.12`, `PyYAML 6.0.3`, `SQLAlchemy 2.0.51`, `alembic 1.18.5`, `annotated-doc 0.0.4`, `annotated-types 0.8.0`, `anyio 4.14.2`, `argon2-cffi 25.1.0`, `argon2-cffi-bindings 25.1.0`, `et_xmlfile 2.0.0`, `fastapi 0.140.0`, `h11 0.16.0`, `httptools 0.8.0`, `openpyxl 3.1.5`, `pydantic 2.13.4`, `pydantic-settings 2.14.2`, `pydantic_core 2.46.4`, `typing-inspection 0.4.2`, `uvloop 0.22.1`, `watchfiles 1.2.0` |
| `BSD-3-Clause` | 8 | `MarkupSafe 3.0.3`, `click 8.4.2`, `idna 3.18`, `pycparser 3.0`, `python-dotenv 1.2.2`, `starlette 1.3.1`, `uvicorn 0.51.0`, `websockets 16.1.1` |
| `LGPL-3.0-only` | 2 | `psycopg 3.3.4`, `psycopg-binary 3.3.4` |
| `Apache-2.0` | 1 | `python-multipart 0.0.32` |
| `ISC` | 1 | `dnspython 2.8.0` |
| `MIT AND PSF-2.0` | 1 | `greenlet 3.5.4` |
| `MIT-0` | 1 | `cffi 2.1.0` |
| `PSF-2.0` | 1 | `typing_extensions 4.16.0` |
| `Unlicense` | 1 | `email-validator 2.3.0` |

### 백엔드 수동 검토

- `psycopg`와 `psycopg-binary`는 PostgreSQL 연결에 쓰이는 실제 서버
  런타임 의존성이다.
- 두 패키지는 `LGPL-3.0-only`이며 GPL-only/AGPL이 아니다. 앱 사용자에게
  서버 라이브러리가 배포되는 구조는 아니므로 일반적인 hosted-service
  실행 자체가 모바일 앱 전체에 강한 copyleft를 전파하지 않는다.
- 프로덕션 컨테이너 이미지를 조직 밖으로 전달하는 경우에는 LGPL 원문,
  저작권 고지, 해당 라이브러리 소스 입수 방법과 교체/재링크 조건을 별도로
  확인하고 보존해야 한다.
- 백엔드의 금지 라이선스와 미확인 라이선스는 각각 0개다.

## 프론트엔드 결과

`package.json`의 direct production dependency는 30개다. `package-lock.json`
v3을 복사한 격리 디렉터리에서 `npm ci --omit=dev --ignore-scripts
--legacy-peer-deps`로 설치한 뒤 전이 의존성까지 검사했다. Expo가
`@expo/cli`와 번들러를 production dependency chain에 두기 때문에, 결과는
실제 앱 JS runtime보다 넓은 보수적 build-and-runtime 공급망 목록이다.

### 라이선스 분포

아래 수는 중첩된 component instance 809개 기준이다. `Apache 2.0`은
`Apache-2.0`으로 정규화했고, `requireg` 1개는 LICENSE 원문 확인 후 `MIT`에
포함했다.

| 라이선스 | component instance |
| --- | ---: |
| `MIT` | 687 |
| `ISC` | 49 |
| `BSD-3-Clause` | 17 |
| `Apache-2.0` | 13 |
| `MPL-2.0` | 12 |
| `BlueOak-1.0.0` | 10 |
| `BSD-2-Clause` | 8 |
| `0BSD` | 2 |
| `Unlicense` | 2 |
| `MIT AND MIT` | 2 |
| `MIT OR CC0-1.0` | 2 |
| `BSD-2-Clause OR MIT OR Apache-2.0` | 1 |
| `BSD-3-Clause OR GPL-2.0` | 1 |
| `CC-BY-4.0` | 1 |
| `MIT AND OFL-1.1` | 1 |
| `Python-2.0` | 1 |
| 합계 | 809 |

### 예외와 실제 포함 여부

| 패키지 | 검출 | 의존 경로·포함 여부 | 판정 |
| --- | --- | --- | --- |
| `node-forge 1.4.0` | `(BSD-3-Clause OR GPL-2.0)` | `expo -> @expo/cli -> node-forge`; host-side 인증서/CLI 도구다. 현재 web export에서 문자열/모듈 흔적이 없었다. | LICENSE가 BSD-3-Clause 또는 GPL-2.0 중 자유 선택을 명시하므로 **BSD-3-Clause를 선택**한다. GPL 적용 없음. |
| `lightningcss 1.33.0` 및 platform package 11개 | `MPL-2.0` | `expo -> @expo/metro-config -> lightningcss`; 빌드 시 CSS 변환 도구다. 현재 web export에 포함되지 않았다. | 약한 file-level copyleft이며 수정하지 않은 build tool이다. 앱 코드에 전파되지 않고 금지 아님. |
| `@expo-google-fonts/inter 0.4.2` | `MIT AND OFL-1.1` | 앱이 400/500/600/700/800/900 weight TTF를 직접 import하므로 실제 artifact에 포함될 대상이다. | 금지 아님. 여섯 TTF 모두 name table ID 0/13/14에 Inter 저작권, OFL 1.1 문구와 URL을 포함함을 확인했다. |
| `caniuse-lite 1.0.30001769` | `CC-BY-4.0` | Babel/Browserlist build chain의 데이터이며 현재 web export에 패키지 데이터가 포함되지 않았다. | 금지 아님. 패키지 자체를 재배포할 경우 귀속 조건 보존. |
| `requireg 0.2.2` | CycloneDX declared-license 필드 누락 | `@expo/cli` build chain이다. package metadata의 legacy `licenses`와 `LICENSE` 원문을 대조했다. | `MIT`로 해소. 미확인 항목 아님. |
| `qrcode-terminal 0.11.0` | lock-only 보조 SBOM의 declared-license 필드 누락 | `@expo/cli` build chain이다. 설치 트리의 package metadata와 `LICENSE` 원문을 대조했다. | `Apache-2.0`으로 해소. 미확인 항목 아님. |
| `sogang-app-frontend 0.1.0` | license checker에서 `UNLICENSED` | `private: true`인 저장소 자체 root component이며 제3자 패키지가 아니다. | 제3자 unknown으로 세지 않음. |

금지 패턴 검색에서 GPL 문자열이 나온 유일한 제3자 항목은 위
`node-forge`의 **OR 이중 라이선스**다. BSD-3-Clause 선택을 원문으로
검증했으므로 강한 copyleft-only 항목은 0개다. AGPL, SSPL, BUSL,
non-commercial, proprietary/unknown 제3자 라이선스는 검출되지 않았다.

## 배포 시 보존 조건

다음은 `REL-14` 감사 결과와 별개로 최종 배포 절차에서 유지해야 할 조건이다.

1. 모바일과 web artifact에 실제 포함되는 MIT/BSD/Apache/OFL 등 제3자
   저작권·라이선스 고지를 release별 `THIRD_PARTY_NOTICES`로 생성하고
   심사 보관 자료에 함께 둔다.
2. Inter font의 OFL 저작권과 라이선스 메타데이터를 최종 asset 최적화 과정에서
   제거하지 않는다.
3. 백엔드 컨테이너를 외부에 배포할 경우 `psycopg`/`psycopg-binary`의 LGPL
   준수 자료를 함께 제공한다. 서버를 운영만 하는 경우와 이미지를 제3자에게
   전달하는 경우를 구분해 법무/운영 책임자가 확인한다.
4. package/lock/requirements 또는 Expo SDK가 바뀔 때 SBOM과 정책 스캔을
   다시 실행한다.
5. 최종 signed AAB/IPA가 생기면 Gradle/CocoaPods/native SDK 및 실제
   embedded asset 기준으로 별도의 artifact-level SBOM/notice 검증을 한다.

현재 repository의 Python 전이 의존성은 별도 lock/hash 파일로 고정되어 있지
않다. 따라서 이 감사의 백엔드 근거는 입력 hash가 일치하는 실제 프로덕션
이미지와 그 이미지에서 추출한 SBOM이다. 미래에 같은 `requirements.txt`를
다시 설치하면 아직 pin되지 않은 전이 버전이 달라질 수 있으므로 새 이미지마다
SBOM을 재생성해야 한다.

## 취약점 감사와의 관계

라이선스 판정과 취약점 판정은 서로 독립적이다. 2026-07-27 현재 확정 수치는
다음과 같다.

| 범위 | critical | high | moderate | 합계 |
| --- | ---: | ---: | ---: | ---: |
| Backend | 0 | 0 | 0 | 0 |
| Frontend runtime (`npm audit --omit=dev`) | 0 | 19 | 14 | 33 |
| Frontend all dependencies | 0 | 26 | 14 | 40 |

따라서 이 문서로 `REL-14`는 `PASS`가 가능하지만, frontend high 취약점에 대한
업그레이드 또는 owner risk acceptance가 끝나기 전 `REL-12`는 계속 `FAIL`이다.

## 재현 명령

아래 명령은 저장소 의존성 파일을 수정하지 않고 임시 디렉터리에만 결과를
생성한다. PowerShell에서 저장소 root를 현재 디렉터리로 두고 실행한다.

```powershell
$repoRoot = (Resolve-Path ".").Path
$auditRoot = Join-Path $env:TEMP ("aisw-rel14-" + [guid]::NewGuid().ToString("N"))
$frontendAudit = Join-Path $auditRoot "frontend"
$backendAudit = Join-Path $auditRoot "backend"

New-Item -ItemType Directory -Path $frontendAudit, $backendAudit | Out-Null
Copy-Item -LiteralPath `
  (Join-Path $repoRoot "frontend\package.json"), `
  (Join-Path $repoRoot "frontend\package-lock.json") `
  -Destination $frontendAudit

Push-Location $frontendAudit
npm ci --omit=dev --ignore-scripts --legacy-peer-deps `
  --cache (Join-Path $auditRoot "npm-cache")

npx --yes --cache (Join-Path $auditRoot "npm-tools-cache") `
  @cyclonedx/cyclonedx-npm@6.0.0 `
  --omit dev --output-reproducible --spec-version 1.6 `
  --output-format JSON --output-file (Join-Path $frontendAudit "frontend.cdx.json") `
  --validate --ignore-npm-errors

npx --yes --cache (Join-Path $auditRoot "npm-tools-cache") `
  license-checker-rseidelsohn@4.4.2 `
  --production --json --unknown --relativeModulePath --relativeLicensePath `
  --out (Join-Path $frontendAudit "frontend-licenses-repro.json")
Pop-Location
```

백엔드는 current source로 이미지를 만든 뒤 그 Linux/Python 3.12 환경을
직접 검사한다.

```powershell
docker build --tag aisw-rel14-backend:local (Join-Path $repoRoot "backend")

docker run --rm --user root `
  -v "${backendAudit}:/audit" `
  --entrypoint sh aisw-rel14-backend:local `
  -c "python -m venv /tmp/audit-tools && \
/tmp/audit-tools/bin/pip install --disable-pip-version-check --no-input \
cyclonedx-bom==7.3.1 pip-licenses==5.5.5 >/tmp/tool-install.log && \
/tmp/audit-tools/bin/cyclonedx-py environment /usr/local/bin/python \
--spec-version 1.6 --output-reproducible --output-format JSON \
--output-file /audit/backend-linux.cdx.json --validate && \
/tmp/audit-tools/bin/pip-licenses --python /usr/local/bin/python --from all \
--format json --with-urls --with-license-file --no-license-path \
--output-file /audit/backend-linux-licenses.json && \
sha256sum /app/requirements.txt"
```

마지막으로 입력과 결과 hash를 기록한다.

```powershell
Get-FileHash -Algorithm SHA256 `
  (Join-Path $repoRoot "backend\requirements.txt"), `
  (Join-Path $repoRoot "frontend\package.json"), `
  (Join-Path $repoRoot "frontend\package-lock.json"), `
  (Join-Path $frontendAudit "frontend.cdx.json"), `
  (Join-Path $frontendAudit "frontend-licenses-repro.json"), `
  (Join-Path $backendAudit "backend-linux.cdx.json"), `
  (Join-Path $backendAudit "backend-linux-licenses.json")
```

## 최종 판정

`REL-14 = PASS`

근거는 다음 세 가지다.

- 고정된 감사 입력 hash와 재현 명령이 있다.
- 실제 백엔드 Linux 이미지 및 frontend production 설치 트리의 CycloneDX
  SBOM이 schema validation을 통과했다.
- 강한 copyleft-only/금지/미확인 제3자 라이선스가 0개이며, 이중·약한
  copyleft·font/data 예외는 실제 포함 경로까지 수동 검토했다.

이 `PASS`는 전체 출시 `GO`가 아니다. signed AAB/IPA의 native dependency와
notice 검증, `REL-12`의 frontend high 취약점 처분, 법무·브랜드·스토어
외부 입력은 각 해당 gate에서 별도로 완료해야 한다.
