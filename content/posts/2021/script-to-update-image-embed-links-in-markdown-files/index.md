---
series: Scripts
date: "2021-07-19T16:03:30Z"
usePageBundles: true
tags:
- linux
- shell
- regex
- jekyll
- meta
title: Script to update image embed links in Markdown files
toc: false
---

I'm preparing to migrate this blog thingy from Hashnode (which has been great!) to a [GitHub Pages site with Jekyll](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/creating-a-github-pages-site-with-jekyll) so that I can write posts locally and then just do a `git push` to publish them - and get some more practice using `git` in the process. Of course, I've written some admittedly-great content here and I don't want to abandon that. 

Hashnode helpfully automatically backs up my posts in Markdown format to a private GitHub repo so it was easy to clone those into a local working directory, but all the embedded images were still hosted on Hashnode:

```markdown

![Clever image title](https://cdn.hashnode.com/res/hashnode/image/upload/v1600098180227/lhTnVwCO3.png)

```

I wanted to download those images to `./assets/images/posts-2020/` within my local Jekyll working directory, and then update the `*.md` files to reflect the correct local path... without doing it all manually. It took a bit of trial and error to get the regex working just right (and the result is neither pretty nor elegant), but here's what I came up with:

```bash
#!/bin/bash
# Hasty script to process a blog post markdown file, capture the URL for embedded images,
# download the image locally, and modify the markdown file with the relative image path.
#
# Run it from the top level of a Jekyll blog directory for best results, and pass the 
# filename of the blog post you'd like to process.
#
# Ex: ./imageMigration.sh 2021-07-19-Bulk-migrating-images-in-a-blog-post.md

postfile="_posts/$1"

imageUrls=($(grep -o -P '(?<=!\[)(?:[^\]]+)\]\(([^\)]+)' $postfile | grep -o -P 'http.*'))
imageNames=($(for name in ${imageUrls[@]}; do echo $name | grep -o -P '[^\/]+\.[[:alnum:]]+$'; done))
imagePaths=($(for name in ${imageNames[@]}; do echo "assets/images/posts-2020/${name}"; done))
echo -e "\nProcessing $postfile...\n"
for index in ${!imageUrls[@]}; do
    echo -e "${imageUrls[index]}\n => ${imagePaths[index]}"
    curl ${imageUrls[index]} --output ${imagePaths[index]}
    sed -i "s|${imageUrls[index]}|${imagePaths[index]}|" $postfile
done
```

I could then run that against all of the Markdown posts under `./_posts/` with:

```bash
for post in $(ls _posts/); do ~/scripts/imageMigration.sh $post; done
```

And the image embeds in the local copy of my posts now all look like this:

```markdown

![Clever image title](lhTnVwCO3.png)

```

Brilliant!