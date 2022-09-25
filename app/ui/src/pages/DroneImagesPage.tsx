import React, { FunctionComponent, useState } from 'react'
import PageContent from './PageContent'
import Container from '@material-ui/core/Container';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import DroneDataTable from './DroneDataTable';
import { makeStyles } from '@material-ui/core/styles';
import { uid } from 'uid';

const useStyles = makeStyles((theme) => ({
    topShift: {
        marginTop: theme.spacing(6)
    },
    sliderBase: {
        '& .react-slider__ul': {
            display: 'none',
        }
    },
    alert: {
        display: 'flex',
        alignItems: 'center',
        '& button': {
            marginLeft: theme.spacing(2)
        }
    },
    textfield: {
        marginLeft: theme.spacing(1)
    },
    recommendation: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing(3)
    },
    edittable: {
        padding: theme.spacing(0.25, 1),
        '&:focus': {
            backgroundColor: 'rgba(0,0,0,0.1)',
            outline: 'none'
        }
    }
}))

const Test: FunctionComponent = () => {
    const classes = useStyles();
    const [inspectionId, setInspectionId] = useState('');
    const [inspectionStarted, setInspectionStarted] = useState(false); 
    const [enableCalculator, setEnableCalculator] = useState(false); 
    const [droneData, setDroneData] = useState([]); 

    // I might have to add updateDroanData functiion here in future
    // It would aslo be nice to add recommendetions for the famrer

    const startInspection = () => {
        const inspectionId = uid();
        console.log(`inspection|${inspectionId}`)
        setInspectionId(inspectionId)
        setInspectionStarted(true);
    };

    return (
        <PageContent title="">
            <Box>
                <Container className={classes.topShift}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography
                                component="h2"
                                variant="h4"
                                color="inherit"
                                gutterBottom
                            >
                                Inspection with Drone
                                <Typography
                                    component="span"
                                    variant="h6"
                                    color="inherit"
                                    gutterBottom
                                >
                                    {inspectionId && ` (${inspectionId})`}
                                </Typography>
                            </Typography>
                            {!inspectionStarted && !enableCalculator &&
                                <Button variant="outlined" color="secondary" onClick={startInspection}>
                                    Start Inspection
                                </Button>}
                        </Grid>
                        {(inspectionStarted || enableCalculator) && <Grid item xs={12} className={classes.sliderBase}>
                            <DroneDataTable
                                droneData={droneData}
                                inspectionStarted={inspectionStarted}
                            />
                        </Grid>}
                    </Grid>
                </Container>
            </Box>
        </PageContent>
    );
}

export default Test
