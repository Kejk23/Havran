# Havran
AI data collection software for drones in InfluxDB
## Description
Havran will be a software application for monitoring drones and storing their data using AI and machine learning. It is still in the early stages of development, but once ready, Havran will be used to pilot your drone and collect data from its camera in the same way you will train it to do so in Unreal Engine. Your drone will then be able to, for example, monitor crops on a field and then use the data for insurance and farm maintenance, monitor heat and vegetation in your town and use it to create heat maps and suggestions for tree and bush planting sites. The choice will be yours.
## Requirments 
To install Griffin, you will have to download a few dependencies, so make sure to install them first before continuing.
### Unreal Engine 4.27
If you use Windows or macOS and you don't have Unreal Engine 4.27 installed, you can follow the instructions listed here: https://docs.unrealengine.com/4.27/en-US/Basics/InstallingUnrealEngine/
#### Instalation for Linux
If you use Linux, make sure you are registered with Epic Games using GitHub. This is required to get source code access for Unreal Engine. Next, open a directory where you clone GitHub projects and paste the following commands.
```bash
git clone -b 4.27 git@github.com:EpicGames/UnrealEngine.git 
cd UnrealEngine 
./Setup.sh 
./GenerateProjectFiles.sh 
make
```
### Python 
To install python, all you have to do is to follow this guideline: https://realpython.com/installing-python/
### Docker
If you don't have docker yet, you can simply download the installation file here https://docs.docker.com/get-docker/
### Redislabs modules 
https://app.redislabs.com/#/rlec-downloads
### Anaconda
To install some python packages, you will need Anacondam, which you can download her: https://www.anaconda.com/products/distribution
### Git
You probably have git already, but if not, you can install it from this website: 
https://git-scm.com/book/en/v2/Getting-Started-Installing-Git
### For Windows users - Visual Studio 2022
This IDE is unfortunately needed to install AirSim, but don't worry, you will use it only for compiling some source codes and you can delete it afterwards. You can download Visual Studio 2022 here: https://visualstudio.microsoft.com/cs/vs/
### For macOS user - Xcode
This IDE is needed not only to install AirSim but also to use Unreal Engine in general. If you don!t have it already, you can simply download it from App Store: https://apps.apple.com/us/app/xcode/id497799835?mt=12
 ## Installation 
Open an anaconda terminal of choice in your destination folder, clone this directory and install requirements.
```bash
git clone https://github.com/Kejk23/Griffin.git
cd Griffin
pip3 install -r requirements.txt
```
### AirSim
Next, we will have to install AirSim. If you have it already, you can skip this step, but if not, please follow the steps below. Installing AirSim, especially on macOS, is so hard nowadays, that I decided to make a python script that installs everything for you. All you have to do now is to run the AirSim_Installer.py script (**in Developer Command Prompt for VS 2022 if you are a Windows user**) by running
```bash
python3 AirSim_installer.py
```
or
```bash
python AirSim_installer.py
```
in your Havran directory. On Windows, a .sln file should open in Visual Studio 2022. Compile it by clicking on a green play button at the top of the screen in the middle.
## How to run
Our application is not ready yet, but you can run the demo version by running the Griffin.py script from anaconda. It will fly the drone and send its data to iot center, but you probably wont see it there, since I have to upload the dynamic page content first.
### On macOS and Windows
If you followed the installation correctly, you should be able to run AirSim by opening Epic Games Launcher, clicking on the Unreal Engine tab and selecting the Blocks environment. If you want to use a different one, all you have to do is to open it using unreal editor. 
### On Linux
Once AirSim is setup, go to the Unreal Engine installation folder and start Unreal by running
```bash
./Engine/Binaries/Linux/UE4Editor
```
When Unreal Engine prompts for opening or creating a project, select Browse and choose
```bash
AirSim/Unreal/Environments/Blocks
```
or your custom Unreal project (if that's the case, make sure to enable the AirSim plugin).

## Acknowledgment

This project was greatly inspired by [CropInsurRedis](https://github.com/piyushjaincloud2/CropInsurRedis), a software demo made for dronification of crop insurerance using drone, redis and cloud technologies. I would like to thank the authors of this project because I used some pieces of CropInsurRedis's code during the development of Havran and it has been really helpful.  
