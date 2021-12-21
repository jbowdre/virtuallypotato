---
title: "Script to Convert Posts to Hugo Page Bundles" # Title of the blog post.
date: 2021-12-21T11:18:58-06:00 # Date of post creation.
# lastmod: 2021-12-21T11:18:58-06:00 # Date when last modified
description: "A hacky script to convert traditional posts (with images stored separately) to a Hugo Page Bundle" # Description used for search engine.
featured: false # Sets if post is a featured post, making appear on the home page side bar.
# draft: true # Sets whether to render this page. Draft of true will not be rendered.
toc: false # Controls if a table of contents should be generated for first-level links automatically.
usePageBundles: true
# menu: main
# featureImage: "/images/posts-2021/12/file.png" # Sets featured image on blog post.
# featureImageAlt: 'Description of image' # Alternative text for featured image.
# featureImageCap: 'This is the featured image.' # Caption (optional).
thumbnail: "thumbnail.png" # Sets thumbnail image appearing inside card on homepage.
# shareImage: "/images/path/share.png" # Designate a separate image for social media sharing.
codeLineNumbers: false # Override global value for showing of line numbers within code block.
codeMaxLines: 30
series: Scripts
tags:
  - hugo
  - meta
  - shell
comment: true # Disable comment if false.
---
In case you missed [the news](/hello-hugo), I recently migrated this blog from a site built with Jekyll to one built with Hugo. One of Hugo's cool features is the concept of [Page Bundles](https://gohugo.io/content-management/page-bundles/), which _bundle_ a page's resources together in one place instead of scattering them all over the place.

Let me illustrate this real quick-like. Focusing only on the content-generating portions of a Hugo site directory might look something like this:

```
site
├── content
│   └── post
│       ├── first-post.md
│       ├── second-post.md
│       └── third-post.md
└── static
    └── images
        ├── logo.png
        └── post
            ├── first-post-image-1.png
            ├── first-post-image-2.png
            ├── first-post-image-3.png
            ├── second-post-image-1.png
            ├── second-post-image-2.png
            ├── third-post-image-1.png
            ├── third-post-image-2.png
            ├── third-post-image-3.png
            └── third-post-image-4.png
```

So the article contents go under `site/content/post/` in a file called `name-of-article.md`. Each article may embed image (or other file types), and those get stored in `site/static/images/post/` and referenced like `![Image for first post](/images/post/first-post-image-1.png)`. When Hugo builds a site, it processes the stuff under the `site/content/` folder to render the Markdown files into browser-friendly HTML pages but it _doesn't_ process anything in the `site/static/` folder; that's treated as static content and just gets dropped as-is into the resulting site. 

It's functional, but things can get pretty messy when you've got a bunch of image files and are struggling to keep track of which images go with which post. 

Like I mentioned earlier, Hugo's Page Bundles group a page's resources together in one place. Each post gets its own folder under `site/content/` and then all of the other files it needs to reference can get dropped in there too. With Page Bundles, the folder tree looks like this:

```
site
├── content
│   └── post
│       ├── first-post
│       │   ├── first-post-image-1.png
│       │   ├── first-post-image-2.png
│       │   ├── first-post-image-3.png
│       │   └── index.md
│       ├── second-post
│       │   ├── index.md
│       │   ├── second-post-image-1.png
│       │   └── second-post-image-2.png
│       └── third-post
│           ├── index.md
│           ├── third-post-image-1.png
│           ├── third-post-image-2.png
│           ├── third-post-image-3.png
│           └── third-post-image-4.png
└── static
    └── images
        └── logo.png
```

Images and other files are now referenced in the post directly like `![Image for post 1](/first-post-image-1.png)`, and this makes it a lot easier to keep track of which images go with which post. And since the files aren't considered to be static anymore, Page Bundles enables Hugo to perform certain [Image Processing tasks](https://gohugo.io/content-management/image-processing/) when the site gets built. 

Anyway, I wanted to start using Page Bundles but didn't want to have to manually go through all my posts to move the images and update the paths so I spent a few minutes cobbling together a quick script to help me out. It's pretty similar to the one I created to help [migrate images from Hashnode to my Jekyll site](/script-to-update-image-embed-links-in-markdown-files/) last time around - and, like that script, it's not pretty, polished, or flexible in the least, but it did the trick for me.

This one needs to be run from one step above the site root (`../site/` in the example above), and it gets passed the relative path to a post (`site/content/posts/first-post.md`). From there, it will create a new folder with the same name (`site/content/posts/first-post/`) and move the post into there while renaming it to `index.md` (`site/content/posts/first-post/index.md`). 

It then looks through the newly-relocated post to find all the image embeds. It moves the image files into the post directory, and then updates the post to point to the new image locations. 

Next it updates the links for any thumbnail images mentioned in the front matter post metadata. In most of my past posts, I reused an image already embedded in the post as the thumbnail so those files would already be moved by the time the script gets to that point. For the few exceptions, it also needs to move those image files over as well.

Lastly, it changes the `usePageBundles` flag from `false` to `true` so that Hugo knows what we've done.

```bash
#!/bin/bash
# Hasty script to convert a given standard Hugo post (where the post content and 
# images are stored separately) to a Page Bundle (where the content and images are
# stored together in the same directory). 
#
# Run this from the directory directly above the site root, and provide the relative 
# path to the existing post that needs to be converted.
#
# Usage: ./convert-to-pagebundle.sh vpotato/content/posts/hello-hugo.md

inputPost="$1"                              # vpotato/content/posts/hello-hugo.md
postPath=$(dirname $inputPost)              # vpotato/content/posts
postTitle=$(basename $inputPost .md)        # hello-hugo
newPath="$postPath/$postTitle"              # vpotato/content/posts/hello-hugo
newPost="$newPath/index.md"                 # vpotato/content/posts/hello-hugo/index.md

siteBase=$(echo "$inputPost" | awk -F/ '{ print $1 }')  # vpotato
mkdir -p "$newPath"                         # make 'hello-hugo' dir
mv "$inputPost" "$newPost"                  # move 'hello-hugo.md' to 'hello-hugo/index.md'

imageLinks=($(grep -o -P '(?<=!\[)(?:[^\]]+)\]\(([^\)]+)' $newPost | grep -o -P '/images.*'))
# Ex: '/images/posts/image-name.png'
imageFiles=($(for file in ${imageLinks[@]}; do basename $file; done))
# Ex: 'image-name.png'
imagePaths=($(for file in ${imageLinks[@]}; do echo "$siteBase/static$file"; done))
# Ex: 'vpotato/static/images/posts/image-name.png'
for index in ${!imagePaths[@]}; do
    mv ${imagePaths[index]} $newPath
    # vpotato/static/images/posts/image-name.png --> vpotato/content/posts/hello-hugo/image-name.png
    sed -i "s^${imageLinks[index]}^${imageFiles[index]}^" $newPost
done

thumbnailLink=$(grep -P '^thumbnail:' $newPost | grep -o -P 'images.*')
# images/posts/thumbnail-name.png
if [[ $thumbnailLink ]]; then
    thumbnailFile=$(basename $thumbnailLink)    # thumbnail-name.png
    sed -i "s|thumbnail: $thumbnailLink|thumbnail: $thumbnailFile|" $newPost
    # relocate the thumbnail file if it hasn't already been moved
    if [[ ! -f "$newPath/$thumbnailFile" ]]; then
        mv "$siteBase/static/$thumbnailLink" "$newPath"
    done
fi
# enable page bundles
sed -i "s|usePageBundles: false|usePageBundles: true|" $newPost
```