#!/bin/bash
# Generate scathing Trump/sedition Facebook post

# Automatically confirm with 'y' since we're running from script
echo 'y' | npm run write -- --url "https://www.bbc.com/news/articles/cx2p2dz9zk2o" --url "https://www.theguardian.com/us-news/2025/nov/21/donald-trump-zohran-mamdani-meeting" --url "https://www.theguardian.com/us-news/2025/nov/21/jimmy-kimmel-donald-trump" --platform facebook --length medium --style conversational --humor 9 --criticism 9 --optimism 2 --urgency 5 --preview
