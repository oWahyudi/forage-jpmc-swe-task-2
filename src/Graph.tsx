import React, { Component } from 'react';
import { Table,ViewConfig } from '@finos/perspective';
import { ServerRespond } from './DataStreamer';
import './Graph.css';
import {PerspectiveViewerConfig} from '@finos/perspective-viewer/dist/esm/viewer';

/**
 * Props declaration for <Graph />
 */
interface IProps {
  data: ServerRespond[],
}

/**
 * Perspective library adds load to HTMLElement prototype.
 * This interface acts as a wrapper for Typescript compiler.
 */
 interface PerspectiveViewerElement {
   load: (table: Table) => void,
   
   //Onggo Wahyudi: Supply methods and properties for configuring the settings of the Perspective Viewer
   restore: (config: ViewConfig) => void,
   setAttribute(arg0: string, arg1: string): unknown;
   view: string,
 }

/**
 * React component that renders Perspective based on data
 * parsed from its parent through data property.
 */
class Graph extends Component<IProps, {}> {
  // Perspective table
  table: Table | undefined;

  //Onggo Wahyudi: Default configuration for the viewer /charting 
  viewerConfig: PerspectiveViewerConfig = {
    columns: ["timestamp","top_ask_price"],
    expressions:["bucket('timestamp', '15s')"],
  };
  
  render() {
    return React.createElement('perspective-viewer');
  }

  componentDidMount() {
    // Get element to attach the table from the DOM.
    const elem: PerspectiveViewerElement = document.getElementsByTagName('perspective-viewer')[0] as unknown as PerspectiveViewerElement;

    const schema = {
      stock: 'string',
      top_ask_price: 'float',
      top_bid_price: 'float',
      timestamp: 'datetime',
    };

    if (window.perspective && window.perspective.worker()) {
      this.table = window.perspective.worker().table(schema);  
    }
    if (this.table) {
      // Load the `table` in the `<perspective-viewer>` DOM reference.

      // Add more Perspective configurations here.      
      elem.load(this.table);
      elem.view='xy_line';
      elem.restore(this.viewerConfig);
      elem.setAttribute('column-pivots','["stock"]'); // Display the prices for all monitored stocks on the chart.
    }
  }

  async componentDidUpdate() {
    // Everytime the data props is updated, insert the data into Perspective table
    if (this.table) {
      // As part of the task, you need to fix the way we update the data props to
      // avoid inserting duplicated entries into Perspective table again.
      /*

      this.table.update(this.props.data.map((el: any) => {
        // Format the data from ServerRespond to the schema
        return {
          stock: el.stock,
          top_ask_price: el.top_ask && el.top_ask.price || 0,
          top_bid_price: el.top_bid && el.top_bid.price || 0,
          timestamp: el.timestamp,
        };
      }));
      */

      //Onggo Wahyudi: Remove any duplicate records based on the timestamp indicator
      //               When there is a refresh in the feed, the duplicate data will be ignored.
      
      const view=await this.table.view();
      const existingDataTimeStamp = new Set((await view.to_json()).map((entry: any) => entry.timestamp));

      const newData = this.props.data
        .filter((el: any) => !existingDataTimeStamp.has(el.timestamp)) 
        .map((el: any) => {
            return {
              stock: el.stock,
              top_ask_price: (el.top_ask && el.top_ask.price) || 0,
              top_bid_price: (el.top_bid && el.top_bid.price) || 0,
              timestamp: el.timestamp,
            };
        });

      this.table.update(newData as any[]);


    }
  }


}

export default Graph;
