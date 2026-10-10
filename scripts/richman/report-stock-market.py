"""Record checked S2-04a artifacts; route plans alone are never UI acceptance."""
import hashlib
import json
import pathlib
import re

root = pathlib.Path(__file__).resolve().parents[2]
temporary = pathlib.Path('/private/tmp')
tests = (temporary / 'richman-04a-tests.log').read_text()
files = re.search(r'Test Files\s+(\d+) passed \((\d+)\)', tests)
cases = re.search(r'Tests\s+(\d+) passed \((\d+)\)', tests)
assert files and files[1] == files[2] == '112'
assert cases and cases[1] == cases[2] == '1649'
assert 'Unhandled Errors' not in tests
build = (temporary / 'richman-04a-build.log').read_text()
assert 'built in' in build and 'error TS' not in build
lint = (temporary / 'richman-04a-lint.log').read_text()
assert '> eslint .' in lint and 'error' not in lint.lower()

def read(path):
    return json.loads(path.read_text())

source = read(root / 'docs/richman/s2-04a-sources.json')
assert len(source['sources']) == 4 and len(source['anchors']) == 22
assert len(source['japanStocks']) == 12
routes = []
for players in [2, 3, 4]:
    stem = root / f'frontend/src/features/richman/game/fixtures/stock-market-v42-{players}'
    manifest = read(pathlib.Path(str(stem) + '-manifest.json'))
    actual = temporary / f'richman-unified-ui-04a-{players}'
    replay = (actual / 'replay.json').read_bytes()
    # Archived JSON is compact; parse/re-encode only to discard whitespace.
    compact = json.dumps(json.loads(replay), ensure_ascii=False, separators=(',', ':')).encode()
    assert hashlib.sha256(compact).hexdigest() == manifest['hashes']['replay']
    assert manifest['report']['normalSpeed'] and manifest['report']['errors'] == []
    assert manifest['report']['cleanup'] == {'raf': 0, 'canvas': 0}
    assert {x['blocked'] for x in manifest['report']['marketChecks']} == {'buy', 'sell'}
    routes.append({**manifest, 'replay': str(stem.relative_to(root)) + '-replay.json',
                   'screenshots': str(actual)})

defaults = {}
for name, directory in [('development', 'richman-unified-ui-04a-default'),
                        ('builtPreview', 'richman-stock-build-default')]:
    result = read(temporary / directory / 'results.json')
    assert result['fingerprint'] == '3d941ac1' and result['defaultMode'] == 'stockMarket'
    assert result['errors'] == [] and result['cleanup'] == {'raf': 0, 'canvas': 0}
    defaults[name] = result

result = {
    'stage': 'S2-04a', 'date': '2026-10-06',
    'rulesId': 'japan-events-candidate-v42', 'fingerprint': '3d941ac1',
    'semanticIncrement': True, 's2_04Complete': False,
    'preserved': {'s2_03CandidateClosed': True, 'items': 43, 'news': 36,
                  'japanFortuneSlots': 37, 'magicEffects': 12, 'minigames': 3,
                  'legacyFingerprintsAndGoldensUnchanged': True},
    'sourceAudit': {'files': 4, 'anchors': 22, 'japanStocks': 12,
                    'referenceCommit': source['referenceCommit'],
                    'nativeWindowsExecution': False},
    'checks': {'frontend': {'passed': 1649, 'files': 112, 'maxWorkers': 2,
                            'newDomain': 46, 'newComponent': 5, 'newActualReplay': 3,
                            'newVersionPlayerCases': 3, 'allVersionPlayerCases': 126},
               'lint': 'passed', 'build': 'passed; existing large-chunk warning',
               'defaultModeUI': defaults},
    'originalMapBrowser': {'routes': routes, 'commands': sum(x['commands'] for x in routes),
                           'trades': sum(x['trades'] for x in routes),
                           'buy': sum(x['buy'] for x in routes),
                           'sell': sum(x['sell'] for x in routes),
                           'normalSpeed': True, 'authOnlyFixture': True,
                           'gameStateInjection': False,
                           'independentAccounting': 'all trades and 12 quotes each open day; closed date unchanged',
                           'continuations': ['buy', 'market-date', 'sell', 'closed-date', 'reopen-date']},
    'resolvedFailures': [
        'Rule-chain circular import caused 18 legacy suite initialization failures and initial UI entry failure; split stock-market-rules from stock-market algorithm, then reran.',
        'Concurrent 3 Chrome routes and full suite caused one old site-circuit timeout and two worker notification timeouts; final full suite after browsers finished passed with maxWorkers=2. No assertion/timeout configuration relaxed.'
    ],
    'notNewBrowserAcceptance': [
        'red/black cards or news combined with new quotes',
        'global/individual suspension combined with new quotes',
        'negative-dividend/loan bankruptcy or G7 use combined with new quotes',
        'new minigame gameplay input (routes only wait for natural return)'
    ],
    'remainingDifferences': source['deferred'],
    'next': 'S2-04b: native average cost, holdings value/profit, manual/cash-subscription/forced-sale accounting; v43 for new semantics',
    'release': {'committed': False, 'pushed': False, 'deployed': False}
}
assert result['originalMapBrowser']['commands'] == 932
assert result['originalMapBrowser']['trades'] == 282
(root / 'docs/richman/s2-04a-results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print('S2-04a: 1649 tests, 3 actual UI routes, 932 commands, 282 trades; evidence recorded')
