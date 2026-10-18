import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const staged = process.argv.includes('--staged');
const names = execFileSync('git', staged ? ['diff','--cached','--name-only','--diff-filter=ACMR','-z'] : ['ls-files','--cached','--others','--exclude-standard','-z'], {encoding:'utf8'}).split('\0').filter(Boolean);
const rules = [
  ['personal filesystem path', /(?:[A-Z]:[\\/]Users[\\/][^\\/\s]+[\\/]|\/Users\/[^/\s]+\/|\/home\/[^/\s]+\/)/i],
  ['private network URL', /https?:\/\/(?:192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|homeassistant\.local)(?=[:/\s"']|$)/i],
  ['credential assignment', /(?:access_token|refresh_token|api_key|password)\s*[=:]\s*["'][^"'\s]{12,}["']/i],
  ['personal HA identifier', /(?:user_id|device_id|person_id)["']?\s*[:=]\s*["'][a-f\d]{32}["']/i],
];
const samples = [
  ['C:', 'Users', 'example', 'file.txt'].join(String.fromCharCode(92)),
  'http' + '://192.168.1.2:8123/',
  'api_key' + '= "' + 'x'.repeat(20) + '"',
  'device_id' + ': "' + 'a'.repeat(32) + '"',
];
rules.forEach(([,pattern],index)=>{assert.ok(pattern.test(samples[index]));assert.equal(pattern.test('entity: light.example'),false);});
const failures=[];
for (const name of new Set(names)) {
  if (/(?:^|\/)(?:\.env(?:\..*)?|secrets\.ya?ml|configuration\.ya?ml|ui-lovelace\.ya?ml)$|(?:^|\/)(?:\.storage|browser-profile)\//i.test(name)) failures.push(`${name}: private configuration file`);
  if (!/\.(?:[cm]?js|json|md|html|ya?ml|txt)$/.test(name)) continue;
  const content = staged ? execFileSync('git',['show',`:${name}`],{encoding:'utf8',maxBuffer:20*1024*1024}) : readFileSync(name,'utf8');
  for (const [description,pattern] of rules) if(pattern.test(content)) failures.push(`${name}: ${description}`);
}
if(failures.length){console.error('Privacy check failed:\n'+failures.join('\n'));process.exitCode=1;}
else console.log(`Privacy patterns: ${new Set(names).size} ${staged?'staged':'public candidate'} files checked. Human review of fixtures and prose is still required.`);
