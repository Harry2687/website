import torch.nn as nn
import torch.nn.functional as F

def conv_block(in_channels, out_channels, pool=False):
    layers = [
        nn.Conv2d(
            in_channels, 
            out_channels, 
            kernel_size=3, 
            padding=1
        ),
        nn.BatchNorm2d(out_channels),
        nn.ReLU()
    ]
    if pool:
        layers.append(
            nn.MaxPool2d(4)
        )
    return nn.Sequential(*layers)

class resnetModel_128(nn.Module):
    def __init__(self):
        super().__init__()
        self.model_name = 'resnetModel_128'

        self.conv_1 = conv_block(1, 64)
        self.res_1 = nn.Sequential(
            conv_block(64, 64), 
            conv_block(64, 64)
        )
        self.conv_2 = conv_block(64, 256, pool=True)
        self.res_2 = nn.Sequential(
            conv_block(256, 256),
            conv_block(256, 256)
        )
        self.conv_3 = conv_block(256, 512, pool=True)
        self.res_3 = nn.Sequential(
            conv_block(512, 512),
            conv_block(512, 512)
        )
        self.conv_4 = conv_block(512, 1024, pool=True)
        self.res_4 = nn.Sequential(
            conv_block(1024, 1024),
            conv_block(1024, 1024)
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(2*2*1024, 2048),
            nn.Dropout(0.5),
            nn.ReLU(),
            nn.Linear(2048, 1024),
            nn.Dropout(0.5),
            nn.ReLU(),
            nn.Linear(1024, 2)
        )
    
    def forward(self, x):
        x = self.conv_1(x)
        x = self.res_1(x) + x
        x = self.conv_2(x)
        x = self.res_2(x) + x
        x = self.conv_3(x)
        x = self.res_3(x) + x
        x = self.conv_4(x)
        x = self.res_4(x) + x
        x = self.classifier(x)
        x = F.softmax(x, dim=1)
        return x