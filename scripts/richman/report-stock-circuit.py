"""Record checked S2-04c artifacts; route plans alone are never UI acceptance."""
import hashlib
import json
import pathlib
import re

root = pathlib.Path(__file__).resolve().parents[2]
temporary = pathlib.Path('/private/tmp')
tests = (temporary / 'richman-04c-tests.log').read_text()
files = re.search(r'Test Files\s+(\d+) passed \((\d+)\)', tests)
cases = re.search(r'Tests\s+(\d+) passed \((\d+)\)', tests)
assert files and files[1] == files[2] == '116'
assert cases and cases[1] == cases[2] == '1718'
assert 'Unhandled Errors' not in tests
build = (temporary / 'richman-04c-build.log').read_text()
assert 'built in' in build and 'error TS' not in build
lint = (temporary / 'richman-04c-lint.log').read_text()
assert '> eslint .' in lint and 'error' not in lint.lower()

def read(path):
    return json.loads(path.read_text())

source = read(root / 'docs/richman/s2-04c-sources.json')
assert len(source['sources']) == 3 and len(source['anchors']) == 19
routes = []
for kind in ['commerce', 'fortune', 'time']:
    stem = root / f'frontend/src/features/richman/game/fixtures/stock-circuit-v44-{kind}'
    manifest = read(pathlib.Path(str(stem) + '-manifest.json'))
    actual = temporary / f'richman-unified-ui-04c-{kind}'
    replay = (actual / 'replay.json').read_bytes()
    # Archived JSON is compact; parse/re-encode only to discard whitespace.
    compact = json.dumps(json.loads(replay), ensure_ascii=False, separators=(',', ':')).encode()
    assert hashlib.sha256(compact).hexdigest() == manifest['hashes']['replay']
    assert manifest['report']['normalSpeed'] and manifest['report']['errors'] == []
    assert manifest['report']['cleanup'] == {'raf': 0, 'canvas': 0}
    assert manifest['report']['circuitCommon'] is True
    routes.append({**manifest, 'replay': str(stem.relative_to(root)) + '-replay.json',
                   'screenshots': str(actual)})

defaults = {}
for name, directory in [('development', 'richman-unified-ui-04c-default'),
                        ('builtPreview', 'richman-stock-circuit-build-default')]:
    result = read(temporary / directory / 'results.json')
    assert result['fingerprint'] == 'f9dbb7e9' and result['defaultMode'] == 'stockCircuit'
    assert result['errors'] == [] and result['cleanup'] == {'raf': 0, 'canvas': 0}
    defaults[name] = result

result = {
 'stage':'S2-04c','date':'2026-10-06','rulesId':'japan-events-candidate-v44','fingerprint':'f9dbb7e9',
 'semanticIncrement':True,'s2_04CandidateClosed':True,'nativeParityComplete':False,
 'closureScope':'Japan ordinary-player candidate quotes/ledger/trading/company/fortune/date/G7; original precision/RNG/chart/input excluded explicitly; bankruptcy/date stress combinations continue in S2-05',
 'preserved':{'s2_03CandidateClosed':True,'items':43,'news':36,'japanFortuneSlots':37,'magicEffects':12,'minigames':3,'legacyFixtureJsonUnchanged':256,'legacyFingerprintsAndGoldensUnchanged':True},
 'sourceAudit':{'files':3,'anchors':19,'referenceCommit':source['referenceCommit'],'nativeWindowsExecution':False},
 'checks':{'frontend':{'passed':1718,'files':116,'maxWorkers':2,'newDomain':26,'newActualReplay':3,'newVersionPlayerCases':3,'allVersionPlayerCases':132},'lint':'passed','build':'passed; existing large-chunk warning','defaultModeUI':defaults},
 'originalMapBrowser':{'routes':routes,'commands':sum(x['commands'] for x in routes),'trades':sum(x['trades'] for x in routes),'subscriptions':sum(x['subscriptions'] for x in routes),'subscriptionPaid':sum(x['subscriptionPaid'] for x in routes),'forcedBank':sum(x['forcedBank'] for x in routes),'forcedPublic':sum(x['forcedPublic'] for x in routes),'quoteDays':sum(x['quoteDays'] for x in routes),'companyTrends':sum(x['companyTrends'] for x in routes),'research':sum(x['research'] for x in routes),'restored':sum(x['restored'] for x in routes),'normalSpeed':True,'authOnlyFixture':True,'gameStateInjection':False,
 'independentAccounting':'each actual public trade/cash subscription/fortune8/9; float32 averages and derived cost; cash/bank/public and supply; company rank owner; daily formula from recorded random draws; closed date; checkpoint restoration and prefix replay',
 'uiAssertions':'real input and subscription receipt amount/pool, stock ledger existence, pause/cancel reset/fullscreen/390px, item time preview/use, normalized final world equals plan, actual replay, reset and cleanup; no claim of every post-event ledger text checked',
 'continuations':sorted({p for x in routes for p in x['prefixes']})},
 'resolvedFailures':['Native source audit found company news red/black failed to persist momentum in v42/v43. New v44 only synchronizes nonzero trend to +10/-10; old replay semantics unchanged.', 'Initial build rejected inferred verifier holding types (TS7022); explicit Holding/number annotations added and build rerun.'],
 'notNewBrowserAcceptance':['manual red/black card use with v44; routes exercised news-driven black trends','global/individual suspension with v44','negative-dividend/loan bankruptcy, necessary debt or exit stock liquidation with new quotes/averages','company news31/34/35 red trend and wrapped zero-code in UI (domain only)','G7 restoring across a new calendar boundary, negative-payment/auction continuation or undoing a cash subscription in same checkpoint (whole-world/domain or historical evidence only)','new minigame input/collision; routes wait for natural end','every post-event holding text; actual exported ledger independently checked'],
 'remainingDifferences':source['retainedDifferences'],'chartInputMatrix':source['chartInputMatrix'],
 'next':'S2-05a: current-profile payment/bankruptcy/date cross-system regression; prioritize negative-dividend and loan due stock liquidation, actual receipts, public disposal and resumable outer dates; no new semantics keeps v44, new semantics v45',
 'release':{'committed':False,'pushed':False,'deployed':False}
}
assert result['originalMapBrowser']['commands']==3375
assert result['originalMapBrowser']['trades']==109
assert result['originalMapBrowser']['subscriptions']==20
(root/'docs/richman/s2-04c-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('S2-04c: 1718 tests, 3 actual UI routes, 3375 commands, 109 market trades and 20 cash subscriptions; candidate closed with explicit differences')
