#!/bin/sh

# This will pro8a8ly only work if you're....like, me!
# So, don't even try, if you aren't.
# 8ut you can tweak it to your own server if that's your vi8e.

node upd8.js --all
rsync -avhL site/ --info=progress2 nebula@ed1.club:/home/nebula/hsmusic
