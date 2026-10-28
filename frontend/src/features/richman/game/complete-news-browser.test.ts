import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {replayGame} from './engine';
import type {Replay} from './engine';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
import manifest from './fixtures/complete-news-v19-manifest.json';
const replays=import.meta.glob('./fixtures/complete-news-v19-*-replay.json',{eager:true,import:'default'});
it.each(manifest)('preserves actual v19 original-map $players-player browser route $route and independent state/events hashes',row=>{
 const replay=replays[`./fixtures/complete-news-v19-${row.route}-replay.json`] as Replay,e=replayGame(nodes,replay);
 expect(replay.commands).toHaveLength(row.commands);expect(e.state.turn).toBe(row.turn);expect(e.state.phase).toBe('turnEnd');
 for(const key of ['state','events'] as const)expect(createHash('sha256').update(JSON.stringify(e[key])).digest('hex')).toBe(row[key]);
 for(const id of row.news)expect(e.events.some(e=>e.type==='newsResolved'&&e.newsId===id&&e.completeChanges)).toBe(true);
 if(row.route==='45')expect(e.events.filter(e=>e.type==='loanChanged').map(e=>e.operation)).toEqual(['borrow','repay']);
},15000);
