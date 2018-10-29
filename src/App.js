import React, { Component } from 'react'
import './App.css'
import ImageFinder from './services/ImageFinder'

class App extends Component {
  constructor(props) {
    super(props);
    this.imageFinder = new ImageFinder('home-motion-capture', 'us-west-2')
    this.preStateImages = []
    this.state = {images: [], metadata: [], metadataLoaded: false, loadedImageCount: 0}
  }

  metadataCallback = (returnedMetadata, done) => {
    let { metadata } = this.state;
    metadata = metadata.concat(returnedMetadata)
    this.setState({metadata: metadata, metadataLoaded: done})
  }

  imageCallback = (image) => {
    let { images, metadata } = this.state;
    this.preStateImages.push(image)
    const accumulatedBufferImages = this.preStateImages.length
    const totalAccumulatedImages = accumulatedBufferImages + images.length
    const totalImageCount = metadata.length
    if (accumulatedBufferImages === 100 || totalAccumulatedImages === totalImageCount) {
      images = images.concat(this.preStateImages).sort(this.imageSortFn)

      this.setState({images: images})
      this.preStateImages = []
    }
  }

  imageSortFn(a, b) {
    return b.lastModified - a.lastModified
  }

  componentDidMount() {
    this.imageFinder.getImages(this.metadataCallback, this.imageCallback)
  }

  render() {
    const { images, metadataLoaded, metadata } = this.state;
    let loadingText = null
    
    if (metadata.length > 0) {
      if (images.length < metadata.length) {
        if (metadataLoaded) {
          loadingText = `Fetching ${metadata.length} images`
        } else {
          loadingText = `Fetching at least ${metadata.length} images`
        }
      }
    } else if (metadataLoaded) {
      loadingText = "No images available"
    } else {
      loadingText = "Fetching metadata"
    }

    const imgs = images.map((image) => {
      return (
        <span className="image" key={image.name}>
          <img src={image.data} alt={image.toString()}></img>
        </span>
      )
    })

    return (
      <div className="App">
        <div>{loadingText}</div>
        {imgs}
      </div>
    );
  }
}

export default App;
