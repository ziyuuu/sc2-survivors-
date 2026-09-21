"""Minimal pinned CASCLib adaptations for public HTTPS and exact-file extraction.
No format/decryption/validation changes. Upstream sources stay in the ignored cache.
"""
from pathlib import Path
import sys
root=Path(sys.argv[1])/'CascLib'
def edit(name,fn):
 p=root/name;s=p.read_text(encoding='utf8');p.write_text(fn(s),encoding='utf8')
def ribbit(s):
 if 'using MimeKit;' not in s:return s
 s=s.replace('using MimeKit;','');a=s.index('                case 1:');b=s.index('                case 2:',a)
 return s[:a]+'                case 1: throw new NotSupportedException("This importer uses public HTTPS metadata only.");\n'+s[b:]
edit('RibbitClient.cs',ribbit)
def config(s):
 s=s.replace('http://{0}/','https://{0}/').replace('else if (File.Exists(BuildConfigKeyOverride))','else if (!string.IsNullOrWhiteSpace(BuildConfigKeyOverride))')
 if 'SelectionPattern' not in s:s=s.replace('public class CASCConfig\n    {','public class CASCConfig\n    {\n        public static string SelectionPattern { get; set; }')
 return s
edit('CASCConfig.cs',config)
def network(s):
 s=s.replace('http://{cdnHost}','https://{cdnHost}')
 if 'req.Timeout = 30000;' not in s:s=s.replace('req.Method = method;', 'req.Method = method;\n            req.Timeout = 30000;')
 return s
edit('Utils.cs',network)
def selection(s):
 if 'CASCConfig.SelectionPattern' not in s:s=s.replace('string file = result.FoundPath;', 'string file = result.FoundPath;\n                if (!string.IsNullOrEmpty(CASCConfig.SelectionPattern) && !Regex.IsMatch(file, CASCConfig.SelectionPattern, RegexOptions.IgnoreCase)) continue;')
 return s
edit('RootHandlers/MNDXRootHandler.cs',selection)

edit('Logger.cs',lambda s:s.replace('public string LogFileName => "debug.log";', 'public string LogFileName => Path.Combine(CDNCache.CachePath, "extract.log");'))
