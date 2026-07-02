#!/bin/bash
# Start all mini-services persistently
cd /home/z/my-project/mini-services/ifd-calculator && exec bun --hot index.ts &
cd /home/z/my-project/mini-services/ece-oracle && exec bun --hot index.ts &
cd /home/z/my-project/mini-services/poue-prover && exec bun --hot index.ts &
wait
