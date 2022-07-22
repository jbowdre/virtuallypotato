---
title: "Hello Hugo" # Title of the blog post.
date: 2021-12-19 # Date of post creation.
lastmod: 2021-12-20
description: "I migrated my blog from a Jekyll site hosted on Github Pages to a Hugo site stored in Gitlab and published via Netlify" # Description used for search engine.
featured: false # Sets if post is a featured post, making appear on the home page side bar.
draft: false # Sets whether to render this page. Draft of true will not be rendered.
toc: false # Controls if a table of contents should be generated for first-level links automatically.
usePageBundles: true
# menu: main
featureImage: "/hugo-logo-wide.png" # Sets featured image on blog post.
# featureImageAlt: 'Description of image' # Alternative text for featured image.
# featureImageCap: 'This is the featured image.' # Caption (optional).
thumbnail: "/hugo-logo-wide.png" # Sets thumbnail image appearing inside card on homepage.
shareImage: "/hugo-logo-wide.png"
# shareImage: "/images/path/share.png" # Designate a separate image for social media sharing.
codeMaxLines: 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers: false # Override global value for showing of line numbers within code block.
tags:
  - meta
  - hugo
comment: true # Disable comment if false.
---
**Oops, I did it again.**

It wasn't [all that long ago](/virtually-potato-migrated-to-github-pages) that I migrated this blog from Hashnode to a Jekyll site published via GitHub Pages. Well, a few weeks ago I learned a bit about another static site generator called [Hugo](https://gohugo.io/), and I just *had* to give it a try. And I came away from my little experiment quite impressed!

While Jekyll is built on Ruby and requires you to install and manage a Ruby environment before being able to use it to generate a site, Hugo is built on Go and requires nothing more than the `hugo` binary. That makes it much easier for me to hop between devices. Getting started with Hugo is [pretty damn simple](https://gohugo.io/getting-started/quick-start/), and Hugo provides some very cool [built-in features](https://gohugo.io/about/features/) which Jekyll would need external plugins to provide. And there are of course [plenty of lovely themes](https://themes.gohugo.io/) to help your site look its best.

Hugo's real claim to fame, though, is its speed. Building a site with Hugo is *much* faster than with Jekyll, and that makes it quicker to test changes locally before pushing them out onto the internet. 

Jekyll was a great way for me to get started on managing my own site with a SSG, but Hugo seems to me like a more modern approach. I decided to start working on migrating Virtually Potato over to Hugo. Hugo even made it easy to import my existing content with the `hugo import jekyll` command. 

After a few hours spent trying out different themes, I landed on the [Hugo Clarity theme](https://github.com/chipzoller/hugo-clarity) which is based on [VMware's Clarity Design](https://clarity.design/). This theme offers a user-selectable light/dark theme, lots of great enhancements for displaying code snippets, and a responsive mobile layout, and I just thought that incorporating some of VMware's style into this site felt somehow appropriate. It did take quite a bit of tweaking to get everything integrated and working the way I wanted it to (and to update the existing content to fit), but I learned a ton in the process so I consider that time well spent. 

Along the way I also wanted to try out [Netlify](https://www.netlify.com/) for building and serving the site online instead of the rather bare-bones GitHub Pages that I'd been using. Like GitHub Pages, you can configure Netlify to watch a repository (on GitHub, GitLab, or Bitbucket) and it will fire off a build whenever new stuff is committed. By default, that latest build will be automatically published to your site, but Netlify also provides much more control of this process. You can pause publishing, manually publish a certain deployment, quickly rollback in case of any issues, and also preview deployments before they get published to the live site. 

Putting Netlify in front of the repositories where my site content is stored also enabled a pretty seamless transition once I was ready to actually flip the switch on the new-and-improved Virtually Potato. I had actually been using Netlify to serve the Jekyll version of this site for a week or two. When it was time to change, I disabled the auto-publish feature to pin that version of the site and then reconfigured which repository Netlify was watching. That kicked off a new (unpublished) deploy of the new Hugo site and I was able to preview it to confirm that everything looked just as it had in my local environment. Once I was satisfied I just clicked a button to start publishing the Hugo-based deploy, and the new site was live, instantly - no messing with DNS records or worrying about certificates, that was all taken care of by Netlify. 

**Anyway, here we are: the new Virtually Potato, powered by Hugo and Netlify!**

![Woohoo!](celebration.gif)