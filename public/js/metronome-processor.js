class MetronomeProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'interval', defaultValue: 0 }];
  }

  constructor() {
    super();
    this.currentSample = 0;
    this.active = true;

    // Add a message event listener to the port
    this.port.onmessage = (event) => {
      if (event.data === 'stop') {
        this.active = false;
        this.currentSample = 0;
      } else if (event.data === 'start') {
        this.active = true;
      }
    };
  }

  process(inputs, outputs, parameters) {
    if (!this.active) {
      return false;
    }

    const output = outputs[0];
    const interval =
      parameters.interval.length > 1
        ? parameters.interval
        : parameters.interval[0];

    for (let channel = 0; channel < output.length; ++channel) {
      const outputChannel = output[channel];
      for (let i = 0; i < outputChannel.length; ++i) {
        this.currentSample++;
        if (interval > 0 && this.currentSample >= interval) {
          this.currentSample = 0;
          this.port.postMessage('beat');
        }
        outputChannel[i] = 0;
      }
    }
    return true;
  }
}

registerProcessor('metronome-processor', MetronomeProcessor);
