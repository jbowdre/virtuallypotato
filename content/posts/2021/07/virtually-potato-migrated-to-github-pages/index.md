---
date: "2021-07-20T22:20:00Z"
thumbnail: 20210720-jekyll.png
usePageBundles: true
tags:
- linux
- meta
- chromeos
- crostini
- jekyll
title: Virtually Potato migrated to GitHub Pages!
---

After a bit less than a year of hosting my little technical blog with [Hashnode](https://hashnode.com), I spent a few days [migrating the content](/script-to-update-image-embed-links-in-markdown-files) over to a new format hosted with [GitHub Pages](https://pages.github.com/). 

![Party!](20210720-party.gif)

### So long, Hashnode
Hashnode served me well for the most part, but it was never really a great fit for me. Hashnode's focus is on developer content, and I'm not really a developer; I'm a sysadmin who occasionally develops solutions to solve my needs, but the code is never the end goal for me. As a result, I didn't spend much time in the (large and extremely active) community associated with Hashnode. It's a perfectly adequate blogging platform apart from the community, but it's really built to prop up that community aspect and I found that to be a bit limiting - particularly once Hashnode stopped letting you create tags to be used within your blog and instead only allowed you to choose from [the tags](https://hashnode.com/tags) already popular in the community. There are hundreds of tags for different coding languages, but not any that would cover the infrastructure virtualization or other technical projects that I tend to write about.

### Hello, GitHub Pages
I knew about GitHub Pages, but had never seriously looked into it. Once I did, though, it seemed like a much better fit for v{:potato:} - particularly when combined with [Jekyll](https://jekyllrb.com/) to take in Markdown posts and render them into static HTML. This approach would provide me more flexibility (and the ability to use whatever [tags](/tags) I want!), while still letting me easily compose my posts with Markdown. And I can now do my composition locally (and even offline!), and just do a `git push` to publish. Very cool!

#### Getting started
I found that the quite-popular [Minimal Mistakes](https://mademistakes.com/work/minimal-mistakes-jekyll-theme/) theme for Jekyll offers a [remote theme starter](https://github.com/mmistakes/mm-github-pages-starter/generate) that can be used to quickly get things going. I just used that generator to spawn a new repository in my GitHub account ([`jbowdre.github.io`](https://github.com/jbowdre/jbowdre.github.io)). And that was it - I had a starter GitHub Pages-hosted Jekyll-powered static site with an elegant theme applied. I could even make changes to the various configuration and sample post files, point any browser to `https://jbowdre.github.io`, and see the results almost immediately. I got to work digging through the lengthy [configuration documentation](https://mmistakes.github.io/minimal-mistakes/docs/configuration/) to start making the site my own, like [connecting with my custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) and enabling [GitHub Issue-based comments](https://github.com/apps/utterances).

#### Working locally
A quick `git clone` operation was sufficient to create a local copy of my new site in my Lenovo Chromebook Duet's [Linux environment](/setting-up-linux-on-a-new-lenovo-chromebook-duet-bonus-arm64-complications). That lets me easily create and edit Markdown posts or configuration files with VS Code, commit them to the local copy of the repo, and then push them back to GitHub when I'm ready to publish the changes. 

In order to view the local changes, I needed to install Jekyll locally as well. I started by installing Ruby and other prerequisites:
```shell
sudo apt-get install ruby-full build-essential zlib1g-dev
```

I added the following to my `~/.zshrc` file so that the gems would be installed under my home directory rather than somewhere more privileged:
```shell
export GEM_HOME="$HOME/gems"
export PATH="$HOME/gems/bin:$PATH"
```

And then ran `source ~/.zshrc` so the change would take immediate effect. 

I could then install Jekyll:
```shell
gem install jekyll bundler
```

I then `cd`ed to the local repo and ran `bundle install` to also load up the components specified in the repo's `Gemfile`.

And, finally, I can run this to start up the local Jekyll server instance:
```shell
❯ bundle exec jekyll serve -l --drafts
Configuration file: /home/jbowdre/projects/jbowdre.github.io/_config.yml
            Source: /home/jbowdre/projects/jbowdre.github.io
       Destination: /home/jbowdre/projects/jbowdre.github.io/_site
 Incremental build: enabled
      Generating... 
      Remote Theme: Using theme mmistakes/minimal-mistakes
       Jekyll Feed: Generating feed for posts
   GitHub Metadata: No GitHub API authentication could be found. Some fields may be missing or have incorrect data.
                    done in 30.978 seconds.
 Auto-regeneration: enabled for '/home/jbowdre/projects/jbowdre.github.io'
LiveReload address: http://0.0.0.0:35729
    Server address: http://0.0.0.0:4000
  Server running... press ctrl-c to stop.
```

And there it is!
![Jekyll running locally on my Chromebook](20210720-jekyll.png)

### `git push` time
Alright that's enough rambling for now. I'm very happy with this new setup, particularly with the automatically-generated Table of Contents to help folks navigate some of my longer posts. (I can't believe I was having to piece those together manually in this blog's previous iteration!)

I'll continue to make some additional tweaks in the coming weeks but for now I'll `git push` this post and get back to documenting my never-ending [vRA project](/series/vra8). 