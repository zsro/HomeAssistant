"""Record checked S2-04b artifacts; route plans alone are never UI acceptance."""
import hashlib
import json
import pathlib
import re

root = pathlib.Path(__file__).resolve().parents[2]
temporary = pathlib.Path('/private/tmp')
tests = (temporary / 'richman-04b-tests.log').read_text()
files = re.search(r'Test Files\s+(\d+) passed \((\d+)\)', tests)
cases = re.search(r'Tests\s+(\d+) passed \((\d+)\)', tests)
assert files and files[1] == files[2] == '114'
assert cases and cases[1] == cases[2] == '1686'
assert 'Unhandled Errors' not in tests
build = (temporary / 'richman-04b-build.log').read_text()
assert 'built in' in build and 'error TS' not in build
lint = (temporary / 'richman-04b-lint.log').read_text()
assert '> eslint .' in lint and 'error' not in lint.lower()

def read(path):
    return json.loads(path.read_text())

source = read(root / 'docs/richman/s2-04b-sources.json')
assert len(source['sources']) == 7 and len(source['anchors']) == 18
routes = []
for players in [2, 3, 4]:
    stem = root / f'frontend/src/features/richman/game/fixtures/stock-ledger-v43-{players}'
    manifest = read(pathlib.Path(str(stem) + '-manifest.json'))
    actual = temporary / f'richman-unified-ui-04b-{players}'
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
for name, directory in [('development', 'richman-unified-ui-04b-default'),
                        ('builtPreview', 'richman-stock-ledger-build-default')]:
    result = read(temporary / directory / 'results.json')
    assert result['fingerprint'] == 'd9c26ce0' and result['defaultMode'] == 'stockLedger'
    assert result['errors'] == [] and result['cleanup'] == {'raf': 0, 'canvas': 0}
    defaults[name] = result

result = {
    'stage': 'S2-04b', 'date': '2026-10-06',
    'rulesId': 'japan-events-candidate-v43', 'fingerprint': 'd9c26ce0',
    'semanticIncrement': True, 's2_04Complete': False,
    'preserved': {'s2_03CandidateClosed': True, 'items': 43, 'news': 36,
                  'japanFortuneSlots': 37, 'magicEffects': 12, 'minigames': 3,
                  'legacyFingerprintsAndGoldensUnchanged': True},
    'sourceAudit': {'files': 7, 'anchors': 18,
                    'referenceCommit': source['referenceCommit'],
                    'nativeWindowsExecution': False},
    'checks': {'frontend': {'passed': 1686, 'files': 114, 'maxWorkers': 2,
                            'newDomain': 27, 'newComponent': 4, 'newActualReplay': 3,
                            'newVersionPlayerCases': 3, 'allVersionPlayerCases': 129},
               'lint': 'passed', 'build': 'passed; existing large-chunk warning',
               'defaultModeUI': defaults},
    'originalMapBrowser': {'routes': routes, 'commands': sum(x['commands'] for x in routes),
                           'trades': sum(x['trades'] for x in routes),
                           'buy': sum(x['buy'] for x in routes),
                           'sell': sum(x['sell'] for x in routes),
                           'normalSpeed': True, 'authOnlyFixture': True,
                           'gameStateInjection': False,
                           'independentAccounting': 'all averages/costs and bank/pool trades; 12 quotes each open day; closed date unchanged',
                           'averagedBuys': sum(x['averagedBuys'] for x in routes), 'partialSales': sum(x['partialSales'] for x in routes), 'clearings': sum(x['clearings'] for x in routes), 'subscriptions': sum(x['subscriptions'] for x in routes),
                           'continuations': ['buy', 'partial-sale', 'sell', 'market-date', 'closed-date', 'reopen-date', 'clear']},
    'resolvedFailures': [
        'First domain assertion mistakenly froze ownership when buying company stock; corrected to verify operating funds unchanged and ownership updated.',
        'Initial test build used catalog wrapper instead of property array; corrected. A build started before fixture archival finished and reported missing JSON; reran after all fixtures existed and explicit verifier event types were added.',
        'Initial three browser runs completed trade commands but failed final selector lookup; corrected selector and reran all routes. Only complete reruns are accepted.'
    ],
    'notNewBrowserAcceptance': [
        'cash subscription combined with public trades',
        'fortune8/9, debt liquidation or exit disposal combined with new averages',
        'red/black cards or news combined with new quotes',
        'global/individual suspension combined with new quotes',
        'negative-dividend/loan bankruptcy or G7 use combined with new quotes',
        'new minigame gameplay input (routes only wait for natural return)'
    ],
    'remainingDifferences': source['retainedDifferences'],
    'next': 'S2-04c: stock cross-system original-map UI and chart/input difference matrix; candidate closure assessment; v44 only for new semantics',
    'release': {'committed': False, 'pushed': False, 'deployed': False}
}
assert result['originalMapBrowser']['commands'] == 1136
assert result['originalMapBrowser']['trades'] == 829
(root / 'docs/richman/s2-04b-results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print('S2-04b: 1686 tests, 3 actual UI routes, 1136 commands, 829 trades; evidence recorded')
