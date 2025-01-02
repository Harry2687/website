import os
import json
import re
import pandas as pd

def ms_import_data(directory: str) -> pd.DataFrame:
    data_file_names = os.listdir(directory)
    data_files = [os.path.join(directory, data_file_name) for data_file_name in data_file_names]

    messenger_data = pd.DataFrame()

    for data_file in data_files:
        with open(data_file) as file:
            data = json.load(file)
        json_data = pd.json_normalize(data['messages'])
        messenger_data = pd.concat([messenger_data, json_data])

    messenger_data = (
        messenger_data[[
            'sender_name',
            'timestamp_ms',
            'content'
        ]]
        .dropna()
        .sort_values('timestamp_ms', ascending=True)
    )

    messenger_data['timestamp'] = pd.to_datetime(messenger_data['timestamp_ms'], unit='ms')

    messenger_data = messenger_data[[
        'sender_name',
        'timestamp',
        'content'
    ]]

    return messenger_data

def remove_custom_stopwords(document: str, stopwords: list) -> str:
    for word in stopwords:
        pattern = r'\b'+word+r'\b'
        document = re.sub(pattern, '', document).replace('  ', ' ')
    
    return document
