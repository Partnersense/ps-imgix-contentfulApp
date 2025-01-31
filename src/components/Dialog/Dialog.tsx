import { Component, ChangeEvent } from 'react';
import { TextInput, Button, Form } from '@contentful/forma-36-react-components';
import { DialogExtensionSDK } from 'contentful-ui-extensions-sdk';
import ImgixAPI, { APIError } from 'imgix-management-js';
import { debounce } from 'lodash';

import { DialogHeader } from './';
import { AppInstallationParameters } from '../ConfigScreen/';
import { ImageGallery } from '../Gallery/';
import { SourceSelect } from '../SourceSelect/';
import { ImageUpLoader } from '../ImageUpload/ImageUploader'
import { Note } from '../Note/';
import {
  IxError,
  invalidApiKeyError,
  noSourcesError,
  noOriginImagesError,
  noSearchImagesError,
} from '../../helpers/errors';

import './Dialog.css';
import packageJson from '../../../package.json';

interface DialogProps {
  sdk: DialogExtensionSDK;
}

export interface AssetProps {
  src: string;
  attributes: Record<string, any>;
}

interface DialogState {
  imgix: ImgixAPI;
  isOpen: boolean;
  allSources: Array<SourceProps>;
  selectedSource: Partial<SourceProps>;
  page: PageProps;
  verified: boolean; // if API key is verified
  searchTerm?: string;
  assets: AssetProps[];
  errors: IxError[]; // array of IxErrors if any
  isSearching: boolean;
}

export type PageProps = {
  currentIndex: number;
  totalPageCount: number;
};

export type SourceProps = {
  id: string;
  name: string;
  domain: string;
};

type AppInvocationParameters = {
  selectedImage: string;
};

export default class Dialog extends Component<DialogProps, DialogState> {
  constructor(props: DialogProps) {
    super(props);

    const installationParameters = props.sdk.parameters
      .installation as AppInstallationParameters;
    const apiKey = installationParameters.imgixAPIKey || '';
    const verified = !!installationParameters.successfullyVerified;
    const imgix = new ImgixAPI({
      apiKey,
      pluginOrigin: `contentful/v${packageJson.version}`,
    });

    this.state = {
      imgix,
      isOpen: false,
      allSources: [],
      selectedSource: {},
      page: {
        currentIndex: 0,
        totalPageCount: 1,
      },
      verified,
      searchTerm: '',
      assets: [],
      errors: [],
      isSearching: false    
    };
  }

  getSources = async () => {
    return await this.state.imgix.request('sources');
  };

  getSourceIDAndPaths = async (): Promise<Array<SourceProps>> => {
    let sources,
      enabledSources: Array<SourceProps> = [];

    try {
      sources = await this.getSources();
    } catch (error) {
      // APIError will emit more helpful data for debugging
      if (error instanceof APIError) {
        console.error(error.toString());
      } else {
        console.error(error);
      }
      return enabledSources;
    }

    /*
     * Resolved requests can either return an array of objects or a single
     * object via the `data` top-level field. When parsing all enabled sources,
     * both possibilities must be accounted for.
     */
    const sourcesArray = Array.isArray(sources.data)
      ? sources.data
      : [sources.data];
    enabledSources = sourcesArray.reduce(
      (result: SourceProps[], source: any) => {
        // TODO: add more explicit types for source
        if (source.attributes.enabled) {
          const id = source.id;
          const name = source.attributes.name;
          // there may be multiple domains, but we'll extract the first one for now
          let domain = source.attributes.deployment.imgix_subdomains[0];
          result.push({ id, name, domain });
        }
        return result;
      },
      [] as SourceProps[],
    );

    return enabledSources;
  };

  handleTotalImageCount = (totalImageCount: number, error: IxError) => {
    const totalPageCount = Math.ceil(totalImageCount / 18);
    let errors = [...this.state.errors];

    if (!totalPageCount) {
      errors.push(error);
    }

    return this.setState({
      page: {
        ...this.state.page,
        totalPageCount,
      },
      errors,
    });
  };

  handlePageChange = (newPageIndex: number) =>
    this.setState({
      page: { ...this.state.page, currentIndex: newPageIndex },
    });

  debounceHandlePageChange = debounce(this.handlePageChange, 1000, {
    leading: true,
  });

  searchOnClick = () => {
    const { searchTerm } = this.state;

    this.setState(
      {
        page: {
          ...this.state.page,
          currentIndex: 0,
        },
        isSearching: true,
      },
      () => {
        const searchQuery = `?filter[or:categories]=${searchTerm}&filter[or:keywords]=${searchTerm}&filter[or:origin_path]=${searchTerm}&page[number]=${this.state.page.currentIndex}&page[size]=18`;
        searchTerm
          ? this.requestImageUrls(searchQuery)
          : this.requestImageUrls();
      },
    );
  };

  debounceSearchOnClick = debounce(this.searchOnClick, 1000, { leading: true });

  setSelectedSource = (source: SourceProps) => {
    this.setState({ selectedSource: source });
  };

  resetNErrors = (n: number = 1) => {
    this.setState({ errors: this.state.errors.slice(n) });
  };

  async componentDidMount() {
    // If the API key is not valid do not attempt to load sources
    if (!this.state.verified) {
      this.setState({
        errors: [invalidApiKeyError()],
      });
      return;
    }
    try {
      const sources = await this.getSourceIDAndPaths();
      if (sources.length === 0) {
        throw noSourcesError();
      }
      this.setState({ allSources: sources });
    } catch (error) {
      this.setState({ errors: [error] as IxError[] });
    }
  }

  getAndCountAssets = async (query: string, error: IxError) => {
    const assets = await this.state.imgix.request(
      `assets/${this.state.selectedSource?.id}${query}`,
    );
    // TODO: add more explicit types for image
    this.handleTotalImageCount(
      parseInt((assets.meta.cursor as any).totalRecords || 0),
      error,
    );
    return assets;
  };

  getAssetObjects = async (query: string, error: IxError) => {
    let assets,
      assetObjects: AssetProps[] = [];

    try {
      assets = await this.getAndCountAssets(query, error);
    } catch (error) {
      // APIError will emit more helpful data for debugging
      if (error instanceof APIError) {
        console.error(error.toString());
      } else {
        console.error(error);
      }
      return assetObjects;
    }

    /*
     * Resolved requests can either return an array of objects or a single
     * object via the `data` top-level field. When parsing all enabled sources,
     * both possibilities must be accounted for.
     */
    if (assets) {
      const assetsArray = Array.isArray(assets.data)
        ? assets.data
        : [assets.data];
      assetObjects = assetsArray.map((asset: any) => {
        this.stringifyJsonFields(asset);
        // TODO: add more explicit types for `asset`
        return {
          src: asset.attributes.origin_path,
          attributes: asset.attributes,
        };
      });

      return assetObjects;
    } else {
      return [];
    }
  };

  /*
   * Stringifies all JSON field values within the asset.attribute object
   */
  stringifyJsonFields = (asset: AssetProps) => {
    const replaceNullWithEmptyString = (_: any, value: any) =>
      value === null ? '' : value;
    asset.attributes.custom_fields = JSON.stringify(
      asset.attributes.custom_fields,
      replaceNullWithEmptyString,
    );
    asset.attributes.tags = JSON.stringify(
      asset.attributes.tags,
      replaceNullWithEmptyString,
    );
    if (asset.attributes.colors?.dominant_colors) {
      asset.attributes.colors.dominant_colors = JSON.stringify(
        asset.attributes.colors?.dominant_colors,
        replaceNullWithEmptyString,
      );
    }
  };

  /*
   * Constructs an array of imgix image URL from the selected source in the
   * application Dialog component
   */
  buildAssetWithFullUrl(asset: AssetProps[]) {
    const scheme = 'https://';
    const domain = this.state.selectedSource.name;
    const imgixDomain = '.imgix.net';

    const transformedAsset = asset.map((asset) => ({
      ...asset,
      src: scheme + domain + imgixDomain + asset.src,
    }));
    return transformedAsset;
  }

  /*
   * Requests and constructs fully-qualified image URLs, saving the results to
   * state
   */
  requestImageUrls = async (query?: string) => {
    // if selected source, return assets
    if (Object.keys(this.state.selectedSource).length) {
      const defaultQuery = `?page[number]=${this.state.page.currentIndex}&page[size]=18`;

      const assetObjects = query
        ? await this.getAssetObjects(query, noSearchImagesError())
        : await this.getAssetObjects(defaultQuery, noOriginImagesError());

      if (assetObjects.length > 0 && this.state.errors.length > 0) {
        this.resetNErrors(this.state.errors.length);
      }

      const assets = this.buildAssetWithFullUrl(assetObjects);
      // if at least one path, remove placeholders

      if (assets.length) {
        this.setState({
          assets,
          isSearching: false,
        });
      } else {
        this.setState({ assets: [] });
      }
    }
  };

  async componentDidUpdate(prevProps: DialogProps, prevState: DialogState) {
    if (
      this.state.selectedSource.id !== prevState.selectedSource.id ||
      (this.state.page.currentIndex !== prevState.page.currentIndex &&
        !this.state.isSearching)
    ) {
      this.requestImageUrls();
    }
  }

  render() {
    const { selectedSource, allSources, page, assets } = this.state;
    const sdk = this.props.sdk;
    const selectedImage = (
      this.props.sdk.parameters.invocation as AppInvocationParameters
    )?.selectedImage;

    return (
      <div className="ix-container">
        <DialogHeader handleClose={sdk.close} selectedImage={selectedImage} />
        <div className="ix-sources">
          <SourceSelect
            selectedSource={selectedSource}
            allSources={allSources}
            setSource={this.setSelectedSource}
            resetErrors={() => this.resetNErrors(this.state.errors.length)}
          />   
          {this.state.selectedSource.id && (
            <Form className="ix-searchForm">
              <TextInput
                type="search"
                className="ix-searchBar"
                placeholder="Search by name or folder path"
                value={this.state.searchTerm}
                onChange={(
                  e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                ) => this.setState({ searchTerm: e.target.value })}
              />
              <Button
                buttonType="muted"
                className="ix-searchButton"
                icon="Search"
                type="submit"
                onClick={this.debounceSearchOnClick}
              >
                Search
              </Button>
            </Form>
          )}
        </div>
        <ImageGallery
          selectedSource={selectedSource}
          sdk={sdk}
          pageInfo={page}
          changePage={this.debounceHandlePageChange}
          assets={assets}
        />
        {/* { UI Error fallback } */}
        {this.state.errors.length > 0 && (
          <Note
            error={this.state.errors[0]}
            type={this.state.errors[0].type}
            resetErrorBoundary={this.resetNErrors}
          />
          
        )}
         {selectedSource.id && 
      <ImageUpLoader selectedSourceID={selectedSource.id} params={this.props.sdk.parameters.installation as AppInstallationParameters} refresh={this.requestImageUrls}/> 
          }
      </div>
     
    );
  }
}
