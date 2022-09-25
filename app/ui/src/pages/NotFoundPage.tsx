import React from 'react'
import {Link, withRouter, RouteComponentProps} from 'react-router-dom'
import PageContent from './PageContent'

function NotFoundPage(props: RouteComponentProps) {
  return (
    <PageContent title={'Page ' + props.location.pathname + ' Not Found'}>
      <>
        Go <Link to="/">Home</Link>
      </>
    </PageContent>
  )
}

export default withRouter(NotFoundPage)
