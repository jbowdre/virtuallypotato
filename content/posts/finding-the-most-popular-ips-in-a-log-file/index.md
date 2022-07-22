---
series: Tips
date: "2020-09-13T08:34:30Z"
usePageBundles: true
tags:
- linux
- shell
- logs
- regex
title: Finding the most popular IPs in a log file
---

I found myself with a sudden need for parsing a Linux server's logs to figure out which host(s) had been slamming it with an unexpected burst of traffic. Sure, there are proper log analysis tools out there which would undoubtedly make short work of this but none of those were installed on this hardened system. So this is what I came up with.

### Find IP-ish strings
This will get you all occurrences of things which look vaguely like IPv4 addresses:
```shell
grep -o -E '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}' ACCESS_LOG.TXT
```
(It's not a perfect IP address regex since it would match things like `987.654.321.555` but it's close enough for my needs.)

### Filter out `localhost`
The log likely include a LOT of traffic to/from `127.0.0.1` so let's toss out `localhost` by piping through `grep -v "127.0.0.1"` (`-v` will do an inverse match - only return results which *don't* match the given expression):
```shell
grep -o -E '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}' ACCESS_LOG.TXT | grep -v "127.0.0.1"
```

### Count up the duplicates
Now we need to know how many times each IP shows up in the log. We can do that by passing the output through `uniq -c` (`uniq` will filter for unique entries, and the `-c` flag will return a count of how many times each result appears):
```shell
grep -o -E '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}' ACCESS_LOG.TXT | grep -v "127.0.0.1" | uniq -c
```

### Sort the results
We can use `sort` to sort the results. `-n` tells it sort based on numeric rather than character values, and `-r` reverses the list so that the larger numbers appear at the top:
```shell
grep -o -E '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}' ACCESS_LOG.TXT | grep -v "127.0.0.1" | uniq -c | sort -n -r
```

### Top 5
And, finally, let's use `head -n 5` to only get the first five results:
```shell
grep -o -E '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}' ACCESS_LOG.TXT | grep -v "127.0.0.1" | uniq -c | sort -n -r | head -n 5
```

### Bonus round!
You know how old log files get rotated and compressed into files like `logname.1.gz`? I *very* recently learned that there are versions of the standard Linux text manipulation tools which can work directly on compressed log files, without having to first extract the files. I'd been doing things the hard way for years - no longer, now that I know about `zcat`, `zdiff`, `zgrep`, and `zless`!

So let's use a `for` loop to iterate through 20 of those compressed logs, and use `date -r [filename]` to get the timestamp for each log as we go:
```bash
for i in {1..20}; do date -r ACCESS_LOG.$i.gz; zgrep -o -E '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}' \ACCESS_LOG.log.$i.gz | grep -v "127.0.0.1" | uniq -c | sort -n -r | head -n 5; done
```
Nice!