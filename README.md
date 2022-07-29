# Griffin
AI data collection software for drones in InfluxDB

## Description
Griffin will be a software application for monitoring drones and storing their data using AI and machine learning. It is still in the early stages of development, but once ready, Griffin will be used to pilot your drone and collect data from its camera in the same way you will train it to do so in Unreal Engine. Your drone will then be able to, for example, monitor crops on a field and then use the date for insurace and farm maintenance, monitor heat and vegetation in your town and use it to create heat maps and suggestions for tree an bush planting sites. The choice will be yours.

## Requirments 
To install Griffin, you will have to download a few dependencies, so make sure to install them first before continuing.

### Unreal Engine 4.27
If you use Windows or macOS and you don't have Unreal Engine 4.27 installed, you can follow the instructions listed here: https://docs.unrealengine.com/4.27/en-US/Basics/InstallingUnrealEngine/
##### Instalation for Linux
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

### Git
You probably have git already, but if not, you can install it from this website: 
https://git-scm.com/book/en/v2/Getting-Started-Installing-Git

### For Windows users - Visual Studio 2022
This IDE is unfortunately needed to install AirSim, but don't worry, you will use it only for compiling some source codes and you can delete it afterwards. You can download Visual Studio 2022 here: https://visualstudio.microsoft.com/cs/vs/

### For macOS user - Xcode
This IDE is needed not only to install AirSim but also to use Unreal Engine in general. If you don!t have it already, you can simply download it from App Store: https://apps.apple.com/us/app/xcode/id497799835?mt=12

 ## Installation 
Open a command prompt/terminal of choice in your destination folder and paste the following commands. Make sure not to close it afterwards, because we will need it later. 
```bash
git clone https://github.com/Kejk23/Griffin.git
cd Griffin

python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt
```

### AirSim
Next, we will have to install AirSim. If you have it already, you can skip this step, but if not, please follow the guide below to install it properly. 

#### Windows
First, start a developer command prompt, ideally in your Griffin folder, and paste the following commands. 
```bash
git clone https://github.com/Microsoft/AirSim.git
cd AirSim
build.cmd
cd Unreal\Environments\Blocks\Blocks.sln
```
This should open a .sln file in Visual Studio 2022. All you have to do now is to run it by clicking on the green play button at the top of the screen in the middle. 

#### macOS
Installing AirSim on macOS is so hard nowadays, that I decided to make a python script that installs it for you. All you have to do now is to paste the following commands in your Griffin folder (which means in the same terminal as before). 
```bash
git clone https://github.com/Microsoft/AirSim.git
python3 AirSim_Installer.py
```

#### Linux 
To install AirSim on Linux, simply run the following commands in your Griffin folder. 
```bash 
git clone https://github.com/Microsoft/AirSim.git 
cd AirSim
./setup.sh 
./build.sh
./Engine/Binaries/Linux/UE4Editor `pwd`
/Unreal/Environments/Blocks/Blocks.uproject
```
Once AirSim is setup, go to the Unreal Engine installation folder and start Unreal by running
```bash
./Engine/Binaries/Linux/UE4Editor
```
When Unreal Engine prompts for opening or creating a project, select Browse and choose
```bash
AirSim/Unreal/Environments/Blocks
```
