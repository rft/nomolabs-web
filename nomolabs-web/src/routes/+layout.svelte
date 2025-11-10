<script>
  import {
    Column,
    Content,
    Grid,
    Header,
    HeaderNav,
    HeaderNavItem,
    HeaderNavMenu,
    Row,
    SkipToContent,
  } from "carbon-components-svelte";

  let isSideNavOpen = false;
</script>

<Header company="" platformName="Nomolabs" bind:isSideNavOpen>
  <svelte:fragment slot="skip-to-content">
    <SkipToContent />
  </svelte:fragment>
  <HeaderNav>
    <HeaderNavItem href="/" text="Blog" />
    <HeaderNavItem href="/" text="Gallery" />
    <HeaderNavItem href="/" text="Tools" />
  </HeaderNav>
</Header>

<Content>
  <Grid>
    <Row>
      <Column>
        <h1>Welcome</h1>
      </Column>
    </Row>
  </Grid>
</Content>

