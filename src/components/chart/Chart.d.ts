import * as React from 'react';

   
interface ChartProps {
    id?: string;
    type?: string;
    data?: object;
    options?: object;
    width?: string;
    height?: string;
    style?: object;
    className?: string;
    plugins?:object;
    onClick?(e:  React.SyntheticEvent): void;
}

export declare class Chart extends React.Component<Chart.ChartProps, any> { }
