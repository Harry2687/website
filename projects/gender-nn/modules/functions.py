import torch
import torchvision.transforms as transforms
import matplotlib.pyplot as plt

unloader = transforms.ToPILImage()

def imshow(tensor):
    image = tensor.cpu().clone()
    image = image.squeeze(0)
    image = unloader(image)
    plt.imshow(image)
    plt.pause(0.001)

def set_device():
    if torch.backends.mps.is_available():
        device = torch.device('mps')
    elif torch.cuda.is_available():
        device = torch.device('cuda')
    else:
        device = torch.device('cpu')

    torch.set_default_device(device)

    return device

def n_parameters(model):
    all_parameters = sum(p.numel() for p in model.parameters())
    trainable_parameters = sum(p.numel() for p in model.parameters() if p.requires_grad)

    return all_parameters, trainable_parameters

attributes = (
    '5_o_Clock_Shadow', 
    'Arched_Eyebrows', 
    'Attractive', 
    'Bags_Under_Eyes', 
    'Bald', 
    'Bangs', 
    'Big_Lips', 
    'Big_Nose', 
    'Black_Hair', 
    'Blond_Hair', 
    'Blurry', 
    'Brown_Hair', 
    'Bushy_Eyebrows', 
    'Chubby', 
    'Double_Chin', 
    'Eyeglasses', 
    'Goatee', 
    'Gray_Hair', 
    'Heavy_Makeup', 
    'High_Cheekbones', 
    'Male', 
    'Mouth_Slightly_Open', 
    'Mustache', 
    'Narrow_Eyes', 
    'No_Beard', 
    'Oval_Face', 
    'Pale_Skin', 
    'Pointy_Nose', 
    'Receding_Hairline', 
    'Rosy_Cheeks', 
    'Sideburns', 
    'Smiling', 
    'Straight_Hair', 
    'Wavy_Hair', 
    'Wearing_Earrings', 
    'Wearing_Hat', 
    'Wearing_Lipstick', 
    'Wearing_Necklace', 
    'Wearing_Necktie', 
    'Young'
)

def mins_to_hours(mins):
    hours = int(mins/60)
    rem_mins = mins % 60
    return hours, rem_mins