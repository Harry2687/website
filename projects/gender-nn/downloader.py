import gdown
import zipfile
import os
import shutil

# Download model
model_url = 'https://drive.google.com/file/d/1_mYn2LrhG080Xvt26tWBtJ8U_0F2E1-s/view?usp=sharing'
model_output = 'projects/gender-nn/trained_models/resnetModel_128_epoch_2.pt'

gdown.download(model_url, model_output, fuzzy=True)

# Download test dataset
test_url = 'https://drive.google.com/file/d/1_oB7QX2rn8-kRTI9uk0KtGIn4DijYDE0/view?usp=sharing'
test_output = 'download.zip'

gdown.download(test_url, test_output, fuzzy=True)

with zipfile.ZipFile(test_output, 'r') as zip_ref:
    zip_ref.extractall('projects/gender-nn/')

os.remove(test_output)
shutil.rmtree('projects/gender-nn/__MACOSX')